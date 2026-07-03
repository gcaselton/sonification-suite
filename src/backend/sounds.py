from paths import SYNTHS_DIR, SAMPLES_DIR
from pydantic import BaseModel

class SoundInfo(BaseModel):
    name: str
    composable: bool
    data_modes: list[str]

# List of sound names that are only suitable for Events (discrete) sonifications
SHORT_SAMPLES = ['Glockenspiel', 'Mallets', 'Harp']

def get_sounds():
      
    local_sounds = []

    for f in SYNTHS_DIR.iterdir():
        if f.is_file():
            composable = f.stem != 'White Noise'
            data_modes = ['continuous', 'discrete']
            sound = SoundInfo(name=f.stem, composable=composable, data_modes=data_modes)
            local_sounds.append(sound)

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