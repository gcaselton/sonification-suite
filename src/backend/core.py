from fastapi import APIRouter, HTTPException, UploadFile, File, Cookie, Response, Request
from fastapi.responses import FileResponse
from pathlib import Path
from paths import TMP_DIR, STYLE_FILES_DIR, SUGGESTED_DATA_DIR, SYNTHS_DIR, SAMPLES_DIR
from context import session_id_var
from utils import resolve_file, is_number, read_YAML_file, write_YAML_file, is_synth, write_sound_to_style
from generator_mods import GENERATOR_MODS
from request_models import DataRequest, CustomStyleSettings, SonificationRequest, SoundInfo
import logging, yaml, os, uuid, traceback, base64, gc, re
from param_descriptions import INPUTS, OUTPUTS
from night_sky import handle_observer
from strauss import AudioFigure

import numpy as np
import pandas as pd
import matplotlib
matplotlib.use("Agg") 
from matplotlib.figure import Figure
from scipy.io import wavfile
from scipy.signal import spectrogram, resample_poly
from io import BytesIO
import lightkurve as lk
from astropy.io import fits
from astropy.table import Table


router = APIRouter(prefix='/core')

logging.basicConfig(level=logging.DEBUG)
LOG = logging.getLogger(__name__)

# Useful constants for '/upload-data/' endpoint
ACCEPTED_UPLOAD_FORMATS = ['.csv', '.fits']
UPLOAD_QUOTA_MB = 50
UPLOAD_QUOTA_BYTES = UPLOAD_QUOTA_MB * 1024 * 1024

FORMATTED_FILENAMES = {
    'light_curves': 'Light Curve',
    'constellations': 'Constellation',
    'night_sky': 'Night Sky'
}

MASTER_VOL = 0.5


@router.get('/session/')
def get_or_create_session(
    response: Response,
    session_id: str | None = Cookie(None)
):
    if not session_id:
        session_id = str(uuid.uuid4())
        response.set_cookie(
            key="session_id",
            value=session_id,
            httponly=True,
            # max_age=24*60*60,  # could use this to make sessions persist across days?
            samesite="none",
            secure=True,
            path='/'
        )

    user_dir = TMP_DIR / session_id
    user_dir.mkdir(exist_ok=True)

    return {'session_id': session_id}

def get_uploads_dir_size(uploads_dir: str) -> int:
    """Returns total size in bytes of all files in a session's uploads directory."""
    try:
        return sum(
            f.stat().st_size
            for f in Path(uploads_dir).rglob('*')
            if f.is_file()
        )
    except Exception as e:
        LOG.warning("Could not calculate session size: %s", e)
        return 0


@router.post('/generate-sonification/')
def generate_sonification(request: SonificationRequest):
    
    if int(request.duration) > 300:
        raise HTTPException(status_code=400, detail="Sonification too long, maximum length = 5 minutes.")
        
    # Resolve data and style file names to actual paths in backend
    data_filepath = resolve_file(request.data_ref)
    style_filepath = resolve_file(request.style_ref)
    
    try:
        
        # First, replace base sound name with filepath to the sound
        style_dict = write_sound_to_style(style_filepath, write_to_yml=False)
        
        # Next, determine data format (CSV, .fits) and convert to DataFrame
        data_type = data_filepath.suffix.lower()
        
        if data_type == '.fits':
                lc = lk.read(str(data_filepath))
                time = lc.time.value
                flux = lc.flux.value
                
                df = pd.DataFrame({
                    "time": np.asarray(time, dtype=np.float64),
                    "flux": np.asarray(flux, dtype=np.float64)
                })
                
                # Interpolate across NaNs for light curves, and fill in empty start and end values
                df['flux'] = df['flux'].interpolate().bfill().ffill()
                
        elif data_type == '.csv':
                df = pd.read_csv(str(data_filepath))
        else:
                raise ValueError(f'{data_type} file type not suitable for sonification, please use .csv or .fits.')
        
        
        # Build dict with keyword arguments for sonification function
        kwargs = {
            'duration': request.duration
        }
        
        # Handle case that 'Place on Dome' feature is used
        if request.observer:
            position_info = handle_observer(request.observer)
            
            # Remove any existing spatial mappings
            style_dict['map'] = [mapping for mapping in style_dict['map'] 
                                 if mapping['output'] not in ['azimuth', 'polar', 'pan']]
            
            # Add fixed values to kwargs
            for param in ['azimuth', 'polar']:
                kwargs[f'fix_{param}'] = position_info['STRAUSS_inputs'][param]
            
            # Get altitude and azimuth values in degrees to send to the frontend to display    
            alt_az = [position_info['display_values'][value] for value in ['altitude', 'azimuth']]
        else:
            alt_az = None
        
        # Add style to kwargs
        kwargs['style'] = str(write_YAML_file(style_dict))
        
        # Initialise an AudioFigure and sonify
        fig = AudioFigure(system=request.system)
        fig.sonify(df, **kwargs)

        session_id = session_id_var.get()

        if not session_id:
            raise HTTPException(status_code=400, detail="No session cookie found")
        
        category = FORMATTED_FILENAMES[request.category]
        ext = '.wav'
        filename = f'{request.data_name} {category}{ext}'
        filepath = TMP_DIR / session_id / filename
        fig.save(filepath)

        file_ref = f'session:{filename}'

        return {'file_ref': file_ref, 'alt_az': alt_az}
    
    except HTTPException:
        raise
    except Exception as e:
        LOG.error("Error generating sonification:\n" + traceback.format_exc())
        raise HTTPException(
            status_code=500,
            detail=f"{type(e).__name__}: {str(e)}"
        )

@router.post('/generate-spectrogram/')
def generate_spectrogram(request: DataRequest):

    filepath = resolve_file(request.file_ref)

    try:
  
        sr, data = wavfile.read(str(filepath))
        
        #Frequency parameters
        freq_min = 20
        freq_max = 22000

        # Convert to mono if stereo
        if data.ndim > 1:
            data = data.mean(axis=1)

        # Normalise to float
        data = data.astype(np.float32) / np.iinfo(np.int32).max
        
        target_sr = 22050

        # Downsample
        if sr != target_sr:
            
            gcd = np.gcd(sr, target_sr)
            up = target_sr // gcd
            down = sr // gcd

            data = resample_poly(data, up, down)
            sr = target_sr
            
        freq_max = sr // 2
        
        duration = len(data) / sr
        nperseg = 2048 if duration < 30 else 1024
        noverlap = nperseg // 2

        freqs, times, Sxx = spectrogram(
            data,
            fs=sr,
            window='hann',
            nperseg=nperseg,
            noverlap=noverlap,
            scaling='spectrum'
        )

        # Convert to dB
        Sxx_dB = 10 * np.log10(Sxx / np.max(Sxx) + 1e-12)

        fig = Figure(figsize=(6, 4))
        ax = fig.add_subplot(111)
        
        ax.pcolormesh(
            times,
            freqs,
            Sxx_dB,
            shading='gouraud',
            cmap='gnuplot2',
            vmin=None,
            vmax=None
        )

        ax.set_xlabel('Time (s)')
        ax.set_yscale('log')
        ax.set_ylim(freq_min, freq_max)
        ax.set_ylabel('Frequency (Hz)')
        ax.spines['top'].set_visible(False)
        ax.spines['right'].set_visible(False)

        buf = BytesIO()
        fig.savefig(buf, format='png', bbox_inches='tight', dpi=150)
        buf.seek(0)
        img_base64 = base64.b64encode(buf.read()).decode('utf-8')

        buf.close()
        gc.collect()

    except Exception as e:
        LOG.error("Error generating spectrogram:\n" + traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"{type(e).__name__}: {str(e)}")
    
    return {'image': img_base64}

@router.get('/audio/{file_ref}')
def get_audio(file_ref: str):

    filepath = resolve_file(file_ref)
    file_name = file_ref.split(':')[-1]
    ext = filepath.suffix.lstrip('.')

    return FileResponse(path=filepath, 
                        filename=file_name,
                        media_type=f"audio/{ext}")


@router.get("/download")
def download_file(file_ref: str):

    file_path = str(resolve_file(file_ref))
    file_name = file_ref.split(':')[-1]
 
    response = FileResponse(
        path=file_path,
        filename=file_name,
        media_type="application/octet-stream",
    )

    response.headers["Cache-Control"] = "no-store, max-age=0"

    return response

def ensure_two_columns(ext: str, contents: bytes):
    
    if ext == ".csv":
        df = pd.read_csv(BytesIO(contents))
        df = df.dropna(axis=1, how='all') # Remove empty columns

    elif ext == ".fits":
        with fits.open(BytesIO(contents)) as hdul:
            # find first table HDU
            table_hdu = next(
                (hdu for hdu in hdul if isinstance(hdu, (fits.BinTableHDU, fits.TableHDU))),
                None
            )

            if table_hdu is None:
                raise HTTPException(400, "FITS file contains no table")

            table = Table(table_hdu.data)
            
            # convert to dataframe
            df = table.to_pandas()
            
            df.columns = [col.lower() for col in df.columns]

            # find time + flux columns
            time_col = next((col for col in df.columns if "time" in col), None)
            flux_col = next((col for col in df.columns if "flux" in col), None)

            if time_col is None or flux_col is None:
                raise HTTPException(400, "FITS file must contain time and flux columns")

            # select only those columns
            df = df[[time_col, flux_col]]
            
            df = df.rename(columns={
                time_col: "Time (days)",
                flux_col: "Flux (electrons per second)"
            })


    else:
        raise HTTPException(415, "Unsupported file format")
    
    # Flag to send to the frontend to inform user that data was sliced
    reduced = False

    if df.shape[1] < 2:
        raise HTTPException(400, "Dataset must contain at least two columns")
    elif df.shape[1] > 2:
        # reduce to first two columns if needed
        df = df.iloc[:, :2]
        reduced = True
        
    # If there are no meaningful headers, assign default names
    if all(is_number(col) for col in df.columns):
        df.columns = ["Column 1", "Column 2"]

    return df, reduced


@router.post('/upload-data/')
async def uploadData(file: UploadFile, request: Request):
    """
    Function for the user to upload their own data to the system, which is then written
    to the tmp directory. The maximum file size is 10mb, as this is a limit set in nginx.

    - **file**: The user-uploaded data file.
    - Returns: The filepath of the saved data file.
    """

    # Client details for logging
    ip = request.client.host
    session_id = session_id_var.get()

    LOG.info(
        "Upload attempt | filename=%s | session=%s | ip=%s",
        file.filename,
        session_id,
        ip
    )

    suffixes = Path(file.filename).suffixes

    # Check for multiple extensions
    if len(suffixes) != 1:
        LOG.warning(
            "Upload rejected | filename=%s | reason=multiple_extensions | session=%s | ip=%s",
            file.filename,
            session_id,
            ip
        )
        raise HTTPException(400, "Files with multiple extensions are not allowed")

    ext = suffixes[0].lower()

    if ext not in ACCEPTED_UPLOAD_FORMATS:
        LOG.warning(
            "Upload rejected | ext=%s | reason=rejected_extension | session=%s | ip=%s",
            ext,
            session_id,
            ip
        )
        raise HTTPException(
            status_code=415,
            detail='Uploaded data must be in .csv or .fits format'
        )

    MAX_SIZE = 10 * 1024 * 1024

    contents = await file.read()
    await file.close()

    # Check for empty file
    if not contents:
        LOG.warning(
            "Upload rejected | reason=empty_file | session=%s | ip=%s",
            session_id,
            ip
        )
        raise HTTPException(400, "Uploaded file is empty")

    # Double check the file size isn't > 10mb
    if len(contents) > MAX_SIZE:
        LOG.warning(
            "Upload rejected | size=%d | reason=file_too_large | session=%s | ip=%s",
            len(contents),
            session_id,
            ip
        )
        raise HTTPException(400, "File too large")

    # Check CSV is actually text
    if ext == ".csv":
        try:
            contents.decode('utf-8')
        except UnicodeDecodeError:
            LOG.warning(
            "Upload rejected | reason=invalid_csv | session=%s | ip=%s",
            session_id,
            ip
            )
            raise HTTPException(415, "Invalid CSV file")
        

    # Check that the uploaded data is only two columns (x,y) and reduce if necessary
    df, reduced = ensure_two_columns(ext, contents)

    # Create random ID to store file under
    new_name = f"{uuid.uuid4()}.csv"

    # Ensure session directory exists
    session_dir = os.path.join(TMP_DIR, session_id)
    os.makedirs(session_dir, exist_ok=True)
    
    # Ensure uploads directory exists
    uploads_dir = os.path.join(session_dir, 'uploads')
    os.makedirs(uploads_dir, exist_ok=True)
    
    print(uploads_dir)
    
    # Check session's upload quota
    current_usage = get_uploads_dir_size(uploads_dir)
    if current_usage + len(contents) > UPLOAD_QUOTA_BYTES:
        LOG.warning(
            "Upload rejected | reason=quota_exceeded | usage=%d | file_size=%d | session=%s | ip=%s",
            current_usage,
            len(contents),
            session_id,
            ip
        )
        raise HTTPException(429, f"Session storage quota of {UPLOAD_QUOTA_MB}MB exceeded")

    filepath = os.path.join(uploads_dir, new_name)

    # Write to new csv file
    df.to_csv(filepath, index=False)

    LOG.info(
        "Upload success | original=%s | stored=%s | size=%d | session=%s | ip=%s",
        file.filename,
        new_name,
        len(contents),
        session_id,
        ip
    )

    file_ref = f"session:uploads:{new_name}"

    return {"file_ref": file_ref, "reduced": reduced}


def round_range(range: list, dp: int = 2) -> list:
    return [round(float(v), dp) for v in range]


@router.get('/get-inputs/')
def get_inputs(file_ref: str, soni_type: str, user_upload: bool = False ):
    
    filepath = str(resolve_file(file_ref))
    
    if filepath.endswith('.csv') and user_upload:
        df = pd.read_csv(filepath)
        
        # If all column names are numeric, the data likely has no headers
        if all(str(col).replace('.', '').replace('-', '').isnumeric() for col in df.columns):
            df = pd.read_csv(filepath, header=None)
            df.columns = [f"Column {i + 1}" for i in range(len(df.columns))]
            
        inputs = [
            {
                'name': col, 
                'desc': '',
                'key': col
            }
            for col in df.columns
        ]

    else:
 
        inputs = [
            {
                'name': INPUTS[soni_type][col]['name'], 
                'desc': INPUTS[soni_type][col]['desc'],
                'key': col
            }
            for col in INPUTS[soni_type]
        ]
    

    return inputs

@router.get('/get-outputs/')
def get_outputs():
    return [
        {'name': v['name'], 'desc': v['desc'], 'key': k}
        for k, v in OUTPUTS.items()
    ]
        
    

@router.get('/suggested-data/{category}/')
def get_suggested(category: str):

    data_dir = SUGGESTED_DATA_DIR / category
    
    if not data_dir.exists():
        raise HTTPException(status_code=404, detail=f'Suggested data directory for {category} not found')
    
    data_list = []

    for file in data_dir.glob('*.yml'):
        try:
            with open(file, 'r') as f:
                data = yaml.safe_load(f)
            name = data.get('name', str(file.stem))  # fallback to filename if 'name' missing
            desc = data.get('description')
            ra = data.get('ra', None)
            dec = data.get('dec', None)
        except Exception as e:
            print(f'Failed to read or parse {file}: {e}')
            continue

        filenames = {
            'light_curves': str(file.stem) + '.fits',
            'constellations': 'hyg.csv'
        }

        file_ref = f'suggested_data:{category}:{filenames[category]}'

        data = {'name': name,
                'description': desc,
                'file_ref': file_ref}
        
        if ra is not None and dec is not None:
            data['ra'] = ra
            data['dec'] = dec

        data_list.append(data)
        
    return data_list

@router.get('/styles/{category}')
def get_styles(category: str):

    styles_dir = STYLE_FILES_DIR / category
    if not styles_dir.exists():
        raise HTTPException(status_code=404, detail="Style directory not found")
    
    styles = []

    for file in styles_dir.glob("*.yml"):
        try:
            with open(file, "r") as f:
                data = yaml.safe_load(f)
            style_name = data.get("name", file.stem)  # fallback to filename if 'name' missing
            style_description = data.get("description", "")
        except Exception as e:
            print(f"Failed to read or parse {file}: {e}")
            continue

        file_ref = f'style_files:{category}:{file.name}'

        style = {'name': style_name, 'description': style_description, 'file_ref': file_ref}

        styles.append(style)

    return styles

def get_sounds():
      
    local_sounds = []
    
    for f in SYNTHS_DIR.iterdir():
        if f.is_file():
            composable = f.stem != 'White Noise'
            data_modes = ['continuous', 'discrete']
            sound = SoundInfo(name=f.stem, composable=composable, data_modes=data_modes)
            local_sounds.append(sound)
            
    # List of sound names that are only suitable for Events (discrete) sonifications
    SHORT_SAMPLES = ['Glockenspiel', 'Mallets', 'Harp']

    for f in SAMPLES_DIR.iterdir():
        if f.is_dir():
            name = f.stem
    
            files = [file for file in f.iterdir() if file.is_file()]

            # Composable if:
            # 1) The directory contains a .sf2 file
            # 2) OR the directory contains multiple files
            composable = (
                any(file.suffix == ".sf2" for file in files)
                or len(files) > 1
            )

            # We are essentially hardcoding which sounds are suitable for Events vs Objects,
            # so if more sounds are added in the future, this categorisation may need to change.
            data_modes = ['discrete'] if name in SHORT_SAMPLES else ['continuous']
          
            sound = SoundInfo(name=name, composable=composable, data_modes=data_modes)
            local_sounds.append(sound)
      
    return local_sounds

@router.get('/sound_info/')
def get_sound_info():
    return get_sounds()

@router.post('/preview-style-settings/')
def preview_style_settings(request: DataRequest):

    # Resolve style ref to path and swap sound name for full filepath
    style = resolve_file(request.file_ref)
    style_dict = write_sound_to_style(style, write_to_yml=False)
    
    # Generate synthetic data for previews
    N = 100 if style_dict["sources"] == "objects" else 50
    
    args = []
    
    for mapping in style_dict["map"]:
        output = mapping["output"]

        if output in ["time", "time_evo"]:
            # Use linear function for time
            args.append(np.linspace(0, 1, N))
        else:
            # Sine wave for all other parameters 
            x = np.linspace(0, np.pi, N) 
            args.append(np.sin(x))
    
    style_file = str(write_YAML_file(style_dict))

    try:
        fig = AudioFigure()
        fig.sonify(*args, style=style_file, duration=5)

        id = str(uuid.uuid4().hex)
        ext = '.wav'
        filename = f'preview_{id}{ext}'
        session_id = session_id_var.get()
        filepath = os.path.join(TMP_DIR, session_id, filename)
        fig.save(filepath)

        file_ref = f'session:{filename}'

        return {'file_ref': file_ref}
    except Exception:
        traceback.print_exc()
        raise
    
@router.post('/save-style-settings/')
def save_sound_settings(settings: CustomStyleSettings):
    """
    Save sound settings for the sonification.

    - **settings**: The sound settings to be saved.
    - Returns: A filename of the saved settings.
    """
    # Save settings to a yaml file and return the filename
    style = format_style(settings)
    filepath = write_YAML_file(style)

    file_ref = f'session:{filepath.name}'

    # Return the file reference
    return {'file_ref': file_ref}

def format_style(settings: CustomStyleSettings):

    sources = 'objects' if settings.dataMode == 'continuous' else 'events'
    
    for m in settings.map:
        
        # If using custom data, swap 'column 1' etc for 0-indexed column index (e.g. 'column 1' -> 0)
        if re.fullmatch(r"column \d+", m["input"]):
            m["input"] = int(m["input"].split()[-1]) - 1
            
        if m['output'] == 'time':
            if sources == 'objects':
                # Swap time for time_evo if using Objects
                m['output'] = 'time_evo'
            else:
                # Add extra time for Events to play out
                m['input_range'] = ['0%', '110%']
                
        elif m['output'] == 'pitch':
            # Swap pitch for pitch_shift if Objects, or Events with no notes given
            m['output'] = 'pitch_shift' if sources == 'objects' or not settings.notes else m['output']
        
        
    # Set up Generator dictionary
    gen_type, sound_key = (
        ("synthesizer", "preset")
        if is_synth(settings.sound)
        else ("sampler", "sample")
    )
        
    generator = {
        'type': gen_type,
        sound_key: settings.sound
    }

    mods = GENERATOR_MODS.get(settings.sound)
    if mods:
        generator["mods"] = mods
    
    
    # Build final style dict
    style = {
        "name": "Custom",
        "sources": sources,
        "generator": generator,
        "map": settings.map,
        "notes": settings.notes
    }
    
    # Add additional fields for Events
    if sources == 'events':
        style['max_notes_per_sec'] = 15
        style['pitch_binning'] = 'uniform'
    
    return style

@router.post("/upload-style/")
async def upload_style(file: UploadFile = File(...), request: Request = None):

    ip = request.client.host
    session_id = session_id_var.get()

    LOG.info(
        "Style upload attempt | filename=%s | session=%s | ip=%s",
        file.filename,
        session_id,
        ip
    )

    # Check for multiple extensions
    suffixes = Path(file.filename).suffixes
    if len(suffixes) != 1:
        LOG.warning(
            "Style upload rejected | filename=%s | reason=multiple_extensions | session=%s | ip=%s",
            file.filename, session_id, ip
        )
        raise HTTPException(400, "Files with multiple extensions are not allowed")

    ext = suffixes[0].lower()
    if ext not in {'.yaml', '.yml'}:
        LOG.warning(
            "Style upload rejected | ext=%s | reason=rejected_extension | session=%s | ip=%s",
            ext, session_id, ip
        )
        raise HTTPException(415, "Uploaded style must be in .yaml or .yml format")

    MAX_SIZE = 1 * 1024 * 1024  # 1MB limit as style files should be very small

    contents = await file.read()
    await file.close()

    if not contents:
        LOG.warning(
            "Style upload rejected | reason=empty_file | session=%s | ip=%s",
            session_id, ip
        )
        raise HTTPException(400, "Uploaded file is empty")

    if len(contents) > MAX_SIZE:
        LOG.warning(
            "Style upload rejected | size=%d | reason=file_too_large | session=%s | ip=%s",
            len(contents), session_id, ip
        )
        raise HTTPException(400, "File too large")

    # Validate YAML
    try:
        contents.decode('utf-8')
    except UnicodeDecodeError:
        LOG.warning(
            "Style upload rejected | reason=invalid_utf8 | session=%s | ip=%s",
            session_id, ip
        )
        raise HTTPException(415, "File does not appear to be a valid YAML file")

    try:
        parsed_yaml = yaml.safe_load(contents)
    except yaml.YAMLError as e:
        LOG.warning(
            "Style upload rejected | reason=invalid_yaml | session=%s | ip=%s",
            session_id, ip
        )
        raise HTTPException(415, f"Invalid YAML: {str(e)}")

    # Ensure session directory exists
    session_dir = os.path.join(TMP_DIR, session_id)
    os.makedirs(session_dir, exist_ok=True)

    # Check session quota
    current_usage = get_session_size(session_dir)
    if current_usage + len(contents) > SESSION_QUOTA_BYTES:
        LOG.warning(
            "Style upload rejected | reason=quota_exceeded | usage=%d | file_size=%d | session=%s | ip=%s",
            current_usage, len(contents), session_id, ip
        )
        raise HTTPException(429, f"Session storage quota of {SESSION_QUOTA_MB}MB exceeded")

    new_name = f"{uuid.uuid4()}{ext}"
    filepath = os.path.join(session_dir, new_name)

    with open(filepath, 'wb') as f:
        f.write(contents)

    LOG.info(
        "Style upload success | original=%s | stored=%s | size=%d | session=%s | ip=%s",
        file.filename,
        new_name,
        len(contents),
        session_id,
        ip
    )

    file_ref = f"session:{new_name}"
    
    return {"file_ref": file_ref, "parsed": parsed_yaml}


