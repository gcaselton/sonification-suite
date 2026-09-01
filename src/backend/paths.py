from pathlib import Path
import shutil
import sys
import os
import yaml


# Directory where this file lives (/backend)
BACKEND_DIR = Path(__file__).resolve().parent

SRC_DIR = BACKEND_DIR.parent

# Project root
ROOT_DIR = SRC_DIR.parent

# Define all paths
STYLE_FILES_DIR = BACKEND_DIR / "style_files"
SUGGESTED_DATA_DIR = BACKEND_DIR / "suggested_data"
HYG_DATA = SUGGESTED_DATA_DIR / "constellations" / "hyg.csv"
TMP_DIR = BACKEND_DIR / "tmp"
TMP_DIR.mkdir(exist_ok=True)
SOUND_ASSETS_DIR = BACKEND_DIR / "sound_assets"
SYNTHS_DIR = SOUND_ASSETS_DIR / "synths"
SAMPLES_DIR = SOUND_ASSETS_DIR / "samples"
SAMPLES_DIR.mkdir(exist_ok=True)



