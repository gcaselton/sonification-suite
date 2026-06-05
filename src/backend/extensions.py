from strauss.sonification import Sonification
from strauss.sources import Objects, Events, param_lim_dict
from strauss.score import Score
from strauss.generator import Synthesizer, Sampler
from strauss.notes import notesharps
from strauss.audio_figure import AudioFigure
from musical_scales import scale as parse_scale
from style_schemas import BaseStyle, ParameterMapping
from settings import load_settings_from_file
from generator_mods import GENERATOR_MODS
from pychord import Chord
from pychord.utils import transpose_note
from paths import *
from pydantic import ValidationError
from night_sky import handle_observer
from copy import deepcopy
from utils import resolve_file, write_YAML_file

import lightkurve as lk
import numpy as np
import pandas as pd
import random, os, yaml
import matplotlib.pyplot as plt
from pathlib import Path
import logging

logger = logging.getLogger(__name__)


def read_YAML_file(filepath):
    
    filepath = Path(filepath)
    with filepath.open(mode='r') as fdata:
        try:
            YAML_dict = yaml.safe_load(fdata)
        except yaml.YAMLError as err:
              raise ValueError("Error reading YAML file, please check the filepath and ensure correct YAML syntax.") from err
    
    return YAML_dict

def update_style(style_filepath: Path | str, observer: dict | None = None):
      """ This loads the style file into a dictionary, and checks if anything needs re-writing into the format that
            STRAUSS expects. These criteria are as follows:
            1. Swap sample file reference to the sample's filepath, if using
            2. Swap 'time' for 'time_evo' if using Objects
            3. Swap 'pitch' for 'pitch_shift' if using Objects, or if Events with no musical notes given.
            4. 

      Args:
          style_filepath (Path | str): The path to the Style file
          observer (dict | None, optional): The dictionary of parameters if 'Place on Dome' feature is being used. Defaults to None.

      Returns:
          _type_: _description_
      """      
      
      # Track whether we need to re-write the style file or not
      updated = False
      
      # Load user style
      style_dict = read_YAML_file(style_filepath)
      
      # 1. Swap sound asset ref for full filepath if necessary
      generator_style = style_dict.get('generator', {})
      sample_name = generator_style.get('sample')
      
      if isinstance(sample_name, str) and sample_name.startswith('sound_assets:'):
            sample_path = resolve_file(sample_name)
            generator_style['sample'] = sample_path
            updated = True
            
      # 2. Swap out 'time' for 'time_evo' if using Objects
      # 3. Swap out 'pitch' for 'pitch_shift' if necessary
      sources = style_dict.get('sources')
      
      if sources == 'objects':
            
            param_swaps = {
                  'time': 'time_evo',
                  'pitch': 'pitch_shift'
            }
            
            for m in style_dict.get('map', {}):
                  if m.get('output') in param_swaps:
                        m['output'] = param_swaps[m['output']]
                        updated = True
                  
      elif sources == 'events' and style_dict.get('notes') is None:
            for m in style_dict.get('map', {}):
                  if m.get('output') == 'pitch':
                        m['output'] = 'pitch_shift'
                        updated = True

      
      # 3. Handle case that 'Place on Dome' feature is requested
      if observer:
            style_dict, alt_az = handle_observer(observer, style_dict)
            updated = True
      else:
            alt_az = None
            
      # Write updated style to new YAML file if necessary
      updated_style = write_YAML_file(style_dict) if updated else Path(style_filepath)
      
      return updated_style, alt_az

def sonify(data: Path | str , style_file: Path | str, length=15, system='mono'):

      # Initialise an AudioFigure object and sonify
      fig = AudioFigure(system=system)
      
      # Determine data format (CSV, .fits) and convert to DataFrame
      data_type = Path(data).suffix.lower()
      
      if data_type == '.fits':
            lc = lk.read(str(data))
            
            df = pd.DataFrame({
                  "time": lc.time.value,
                  "flux": lc.flux.value
            })
      elif data_type == '.csv':
            df = pd.read_csv(str(data))
      else:
            raise ValueError(f'{data_type} file type not suitable for sonification, please use .csv or .fits.')
      
      # Sonify
      sonification = fig.sonify(df, style=style_file, duration=length)
      sonification.render()

      return sonification
        

def ensure_array(data):
      return data if isinstance(data, np.ndarray) else np.array(data)


def find_sound(sound_name):

    # Search for any file starting with 'sound_name'
    synth_matches = list(SYNTHS_DIR.glob(f"{sound_name}.*"))
    samples_matches = list(SAMPLES_DIR.glob(f"{sound_name}*"))

    if synth_matches and samples_matches:
          raise ValueError(f'The name "{sound_name}" is present in both /synths and /samples directories.')
    elif synth_matches:
        return "synths", synth_matches[0]
    elif samples_matches:
        return "samples", samples_matches[0]
    else:
        raise ValueError(f'"{sound_name}" not found in the sound_assets directory.')


def get_filepath(directory):
      name = os.listdir(directory)[0]
      return os.path.join(directory, name)



def setup_strauss(data: Path | str | tuple, style: BaseStyle, sonify_type, length):

      # Read and find sound to create Generator
      folder, path = find_sound(style.sound)

      if folder == 'synths':
            generator = Synthesizer()
            path_stem = str(path.with_suffix(""))
            generator.load_preset(path_stem)

            # NOTE To do: Modify preset for ADSR if using scale
      else:
            path = str(path)
            inner_file = get_filepath(path)
            generator = Sampler(inner_file, sf_preset=1) if inner_file.endswith('.sf2') else Sampler(path)

            if style.preset:
                  generator.load_preset(style.preset)

            if style.mods:
                  generator.modify_preset(style.mods)
            elif style.sound in GENERATOR_MODS[sonify_type]:
                  generator.modify_preset(GENERATOR_MODS[sonify_type][style.sound])
                  

      mappings = style.parameters

      outputs = [mapping.output for mapping in mappings]

      # Check if filter needs switching on
      if 'cutoff' in outputs:
            generator.modify_preset({'filter': 'on'})
      
      # Set up the data and Sources
      if sonify_type == 'light_curves':
            sources = light_curve_sources(data, style, length)
      elif sonify_type == 'constellations' or sonify_type == 'night_sky':
            sources = constellation_sources(data, style, length)
      else:
            raise ValueError(f'Sonification type "{sonify_type}" not recognised.')
      
      # Handle chord or scale
      is_chord = False
      
      if style.harmony:

            if isinstance(style.harmony, str):
                  notes, is_chord = parse_harmony(style.harmony, folder, path)
            else:
                  notes = [style.harmony]
                  
      else:
            notes = [['A3']] # Change this?
            
      pitch_bin_mode = 'uniform' if 'pitch' in outputs and not is_chord else 'adaptive'
      
      score = Score(notes,length, pitch_binning=pitch_bin_mode)

      return score, sources, generator

def parse_harmony(harmony: str, sound_folder, sound_path):

      if ' ' in harmony:
            
            # Likely a scale e.g 'C major'
            is_chord = False 
            root, quality = harmony.split(' ', 1)

            # Enforce 'hijaroshi' typo from scales library
            quality = 'hijaroshi' if quality == 'hirajoshi' else quality
            notes = parse_scale(starting_note=root, mode=quality, octaves=2) # 3 octave range as default, could give users the option?
            notes = [str(note) for note in notes]
            
      else:
            # Likely a chord e.g. 'Cmaj7'
            is_chord = True
            notes = voice_chord(harmony, sound_folder, sound_path)
            
      if sound_folder == 'samples':
            notes = constrain_notes(notes, sound_path)


      return [notes], is_chord

def constrain_notes(desired_notes, sound_path):
    
    sample_folder = Path(sound_path)
    available_notes = [p.stem for p in sample_folder.iterdir() if p.is_file()]
    
    def extract_note(stem):
        return stem.split('_')[-1]
    
    available_note_set = {extract_note(stem) for stem in available_notes}
    
    constrained = []
    
    for note in desired_notes:
        if note in available_note_set:
            constrained.append(note)
        else:
            pitch_class = ''.join(c for c in note if not c.isdigit())
            octave = int(''.join(c for c in note if c.isdigit() or c == '-'))
            
            matched = None
            max_range = 10
            for delta in range(0, max_range):
                for direction in ([0] if delta == 0 else [delta, -delta]):
                    candidate = f"{pitch_class}{octave + direction}"
                    if candidate in available_note_set:
                        matched = candidate
                        break
                if matched:
                    break
            
            if matched:
                constrained.append(matched)
    
    return constrained
                  

def univariate_sources(xy_data: tuple, params, chord_mode):
      # NOTE to do: make this into a more generic function for univariate data?
      pass

def parse_percentile(val):
    """Extract numeric value from a percentile string like '110%', or return the float directly."""
    if isinstance(val, str):
        return float(val.strip('%'))
    return float(val)

def constellation_sources(data: Path | str , style: BaseStyle, length):

      data_filepath = str(data)

      if data_filepath.endswith('.csv'):

            df = pd.read_csv(data_filepath)
      else:
            raise ValueError('Data file must be a .csv file.')
      
      # Remove rows with NaN values in any of the columns used
      input_params = [mapping.input for mapping in style.parameters if isinstance(mapping.input, str)]
      df = df.dropna(subset=input_params)

      data_dict = {
            'pitch': [0]*len(df)
      }
      m_lims = {}
      p_lims = {}
      my_funcs = {}
      
      for mapping in style.parameters:

            input = mapping.input
            output = mapping.output
            
            if output == 'pitch' and style.harmony is None:
                  output = 'pitch_shift'
                  # Rescale 0-1 to 0-12 semitones for pitch shift
                  mapping.output_range = tuple(12 * x for x in mapping.output_range) if mapping.output_range else (0,12)
            
            # Swap out pan for azimuth and rescale the range
            if output == 'pan':
                  output = 'azimuth'
                  mapping.output_range = tuple(0.25 + 0.5 * x for x in mapping.output_range) if mapping.output_range else (0.25, 0.75)

            if output == 'azimuth' and isinstance(input, str):
                  # Rescale input values if using azimuth
                  df[input] = rescale_col(df, input, (0, 1))

                  # Add constant polar of 0.5
                  data_dict['polar'] = np.full(len(df), 0.5)

            # Invert data for e.g. magnitude (smaller magnitude is brighter)
            if mapping.function == 'invert':
                  my_funcs[output] = lambda x: np.negative(x)

            # Map data
            if isinstance(input, float):
                  # Is a constant spatial param, e.g. azimuth or polar
                  data_dict[output] = np.full(len(df), input)
            else:
                  # Every other type of param
                  data_dict[output] = df[input].to_numpy(dtype=float)
                  m_lims[output] = mapping.input_range

            if mapping.output_range:
                  p_lims[output] = mapping.output_range
                  
                  
      # Ensure time upper limit is at least 110% to allow some time at the end
      if 'time' in m_lims and m_lims['time'] is not None:
            lower, upper = m_lims['time']
            if parse_percentile(upper) <= 100:
                  m_lims['time'] = (lower, '110%')
      else:
            m_lims['time'] = ('0%', '110%')
                  
      sources = Events(data_dict.keys())
     
      sources.fromdict(data_dict)
      sources.apply_mapping_functions(map_funcs=my_funcs, map_lims=m_lims, param_lims=p_lims)

      return sources
      
            

def rescale_col(df, col, target_range=(0.0, 1.0)):
    t_min, t_max = target_range

    # If the column has one unique value, fallback to center of the target range
    if df[col].nunique() == 1:
        center = (t_min + t_max) / 2
        return pd.Series(center, index=df.index)

    min_val = df[col].min()
    max_val = df[col].max()

    # Normalize to 0–1, then stretch to target range
    normalized = (df[col] - min_val) / (max_val - min_val)

    return t_min + normalized * (t_max - t_min)

def convert_percent_to_values(param_lims: tuple):
    """
    Convert mapping limits to fractions for STRAUSS.
    Supports:
        - strings like '0%', '104%'
        - numeric values (0, 104)
    Returns:
        tuple of floats (low, high)
    """
    low, high = param_lims

    if isinstance(low, str) and low.endswith('%'):
        low_val = float(low.rstrip('%')) / 100.0
        high_val = float(high.rstrip('%')) / 100.0
    else:
        low_val = float(low)
        high_val = float(high)

    return (low_val, high_val)


def scale_events(labelled_data: dict, params: list[ParameterMapping], length):
      
      user_settings = load_settings_from_file()
      resolution = user_settings['data_resolution']
      
      time_input = next((p.input for p in params if p.output == 'time'), None)

      if time_input is None:
            raise ValueError('There must be one parameter mapped to time.')
      
      x = labelled_data[time_input]
      y = next(v for k, v in labelled_data.items() if k != time_input)

      new_x, new_y = downsample_data(x, y, length, resolution)

      data = {'pitch': new_y,
              'time': new_x}

      m_lims = {'time': ('0%','110%'),
                'pitch': ('0%', '100%')
                }
      
      p_lims = {}
      funcs = {}

      for mapping in params:
            
            if mapping.function == 'invert':
                  funcs[mapping.output] = lambda x: np.negative(x)
                  
            if mapping.output not in data.keys():
                  
                  # Swap out pan for azimuth and rescale the range
                  if mapping.output == 'pan':
                        mapping.output = 'azimuth'
                        mapping.output_range = tuple(0.25 + 0.5 * x for x in mapping.output_range) if mapping.output_range else (0.25, 0.75)
                  
                  if isinstance(mapping.input, float):
                        # Is a fixed spatial param e.g. azimuth
                        data[mapping.output] = [mapping.input]*len(new_x)
                  else:
                        # all other mappings 
                        data[mapping.output] = new_y
                        m_lims[mapping.output] = mapping.input_range if mapping.input_range else ('0%', '100%')
                        
                        if mapping.output == 'azimuth':
                              data['polar'] = [0.5]*len(new_x)
                  
                  if mapping.output_range:
                        p_lims[mapping.output] = mapping.output_range
      
      sources = Events(data.keys())
      sources.fromdict(data)
      sources.apply_mapping_functions(map_funcs=funcs, map_lims=m_lims, param_lims=p_lims) # Problem here: 'pitch cannot be evolved'
      

      return sources

def light_curve_sources(data, style: BaseStyle, length):
      
      labelled_data = {}

      if isinstance(data, tuple):
            
            labelled_data['time'] = data[0]
            labelled_data['flux'] = data[1]
            
      elif isinstance(data, Path):
            
            
            if data.suffix == '.fits':

                  lc = lk.read(data)
                  lc = lc.remove_nans()
                  
                  time = ensure_array(lc.time.value)
                  flux = ensure_array(lc.flux.value)
                  
                  labelled_data['time'] = time
                  labelled_data['flux'] = flux

            elif data.suffix == '.csv':

                  df = pd.read_csv(data)

                  # Remove rows with NaN values in either column
                  df = df.dropna()

                  col1, col2 = df.columns[:2]
                  
                  col1 = col1.replace('Time (days)', 'time')
                  col2 = col2.replace('Flux (electrons per second)', 'flux')
                  
                  style_inputs = [mapping.input for mapping in style.parameters]
                  
                  # Auto-assign time and flux if there is a style/data input mismatch
                  col1 = col1 if col1 in style_inputs else 'time'
                  col2 = col2 if col2 in style_inputs else 'flux'
            
                  labelled_data[col1] = df.iloc[:, 0].to_numpy()
                  labelled_data[col2] = df.iloc[:, 1].to_numpy()

      is_scale = ((style.harmony and ' ' in style.harmony) or (style.preset == 'staccato'))

      pitches = [0] if is_scale else [0,1,2,3]
      
      data_dict = {'pitch': pitches}
      funcs = {}
      m_lims = {}
      p_lims = {}
      
      # Make a copy of params before mutating 'time' to 'time_evo' later
      params_copy = deepcopy(style.parameters)

      for mapping in style.parameters:
            
            if mapping.output == 'pitch':
                  if is_scale:
                        # Return Events type for scale mapping
                        return scale_events(labelled_data, params_copy, length)
                  else:
                        # Change pitch for pitch_shift if we want Objects type
                        mapping.output = 'pitch_shift'
                        
                        # Rescale 0-1 to 0-12 semitones for pitch shift
                        mapping.output_range = tuple(24 * x for x in mapping.output_range) if mapping.output_range else (0,24)
            
            if mapping.function == 'invert':
                  funcs[mapping.output] = lambda x: np.negative(x)
                        
            mapping.output = 'time_evo' if mapping.output == 'time' else mapping.output
            
            # Swap out pan for azimuth and rescale the range
            if mapping.output == 'pan':
                  mapping.output = 'azimuth'
                  mapping.output_range = tuple(0.25 + 0.5 * x for x in mapping.output_range) if mapping.output_range else (0.25, 0.75)

                        
            if isinstance(mapping.input, float):
                  # Is a constant spatial param, e.g. azimuth or polar
                  data_dict[mapping.output] = [mapping.input]*len(pitches)
            else:
                  # Every other type of param
                  data_dict[mapping.output] = [labelled_data[mapping.input]]*len(pitches)
                  m_lims[mapping.output] = mapping.input_range if mapping.input_range else ('0%', '100%')
                  
                  if mapping.output == 'azimuth':
                        data_dict['polar'] = [0.5]*len(pitches)
                  
            if mapping.output_range:
                  p_lims[mapping.output] = mapping.output_range
      
      
      sources = Objects(data_dict.keys())
      sources.fromdict(data_dict)
      sources.apply_mapping_functions(map_funcs=funcs, map_lims=m_lims, param_lims=p_lims)

      return sources

def downsample_data(x, y, length_in_sec, resolution):
    
    old_n = len(x)
    new_n = int(resolution * length_in_sec)

    if old_n <= new_n:
        return x, y

    bins = np.array_split(y, new_n)
    downsampled_y = np.array([float(np.mean(b)) for b in bins])
    downsampled_x = np.linspace(x[0], x[-1], len(downsampled_y))

    return downsampled_x, downsampled_y


def normalise(array):
      return (array - array.min()) / (array.max() - array.min())
            

def voice_chord(chord_name: str, sound_folder: str, sound_path: str):

      # This will raise a ValueError if chord_name is invalid.
      chord = Chord(chord_name)
      notes = chord.components()
      root = chord.root
      fifth = transpose_note(root, 7, root)
    

      # Chord needs a fifth to be voiced pleasantly
      if not fifth in notes:
            raise ValueError('Chord must have a perfect fifth')
      else:
            remaining_notes = [note for note in notes if note not in [root, fifth]]
      
      # Voice the chord depending on which notes it has
      if len(remaining_notes) == 1:
            # Likely a major or minor triad
            third_note = remaining_notes[0]
            fourth_note = root
      elif len(remaining_notes) == 2:
            third_note = remaining_notes[0]
            fourth_note = remaining_notes[1]
      elif len(remaining_notes) == 3:
            # NOTE - Need to allow for 5+ notes in a chord e.g. Cmaj9
            fifth = remaining_notes[0]
            third_note = remaining_notes[1]
            fourth_note = remaining_notes[2]
      elif len(remaining_notes) == 0:
            third_note = root
            fourth_note = fifth
      else:
            raise ValueError(f'{chord_name} is too complex, maximum of 5 notes allowed.')
      
      notes = [root + '2', fifth + '3', third_note + '4', fourth_note + '5']

      return notes

      

def random_chord():
      
      root_note = random.choice(notesharps)
      fifth = transpose_note(root_note, 7)
      
      interval_pairs = [[11,2],[4,2],[4,11],[10,5]]
      
      chosen_pair = random.choice(interval_pairs)
      random.shuffle(chosen_pair)
      
      third_note = transpose_note(root_note, chosen_pair[0])
      fourth_note = transpose_note(root_note, chosen_pair[1])

      return [[root_note + '2', fifth + '3', third_note + '4', fourth_note + '5']]


        
