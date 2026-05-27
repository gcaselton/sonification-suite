from pathlib import Path
from context import session_id_var
from paths import TMP_DIR, BACKEND_DIR
from fastapi import HTTPException
import os, yaml, uuid

def resolve_file(file_ref: str) -> Path:
    """
    Helper function to resolve a file reference to it's full filepath in the backend.

    :param file_ref: The name of the requested file e.g. 'Sci-Fi.yml'
    :type file_ref: str
  
    :return: The full filepath of the requested file
    :rtype: Path
    """
    
    ref_parts = file_ref.split(':')

    if ref_parts[0] == 'session':

        session_id = session_id_var.get()
        
        if not session_id:
            raise HTTPException(status_code=400, detail="No session cookie found")
    
        path = TMP_DIR / session_id / ref_parts[-1]
    else:
        path = BACKEND_DIR / ref_parts[0] / ref_parts[1] / ref_parts[-1]

    if not path.exists():
        raise HTTPException(
            status_code=400,
            detail=f"File ref not found: {file_ref}"
        )
    
    
    return path


def write_YAML_file(yaml_dict: dict):
    
    filename = f'style_{uuid.uuid4()}.yaml'
    session_id = session_id_var.get()
    filepath = os.path.join(TMP_DIR, session_id, filename)

    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    
    with open(filepath, 'w', encoding='utf-8') as f:
        yaml.dump(yaml_dict, f, default_flow_style=False)
        
    return filepath


def is_number(x):
    try:
        float(x)
        return True
    except ValueError:
        return False

