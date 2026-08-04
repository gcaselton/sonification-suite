from fastapi import APIRouter, HTTPException, Request
from pathlib import Path
from paths import TMP_DIR, STYLE_FILES_DIR, SUGGESTED_DATA_DIR, SAMPLES_DIR
from context import session_id_var
from request_models import ColumnRequest, ComposerRefineRequest as RefineRequest
from utils import resolve_file
import numpy as np
import pandas as pd



router = APIRouter(prefix='/data-composer')

@router.post('/get-columns/')
def get_columns(request: ColumnRequest):
    
    filepath = str(resolve_file(request.file_ref))
    
    df = pd.read_csv(filepath, header=0 if request.has_header else None)
    
    col_info = []
    
    for i, col in enumerate(df.columns):
        col_info.append(
            {
                'name': str(col) if request.has_header else f'Column {i + 1}',
                'NaNs': int(df[col].isna().sum())
            }
        )
        
    return {'columns': col_info, 'total_rows': len(df.index)}

@router.post('/preview-refined/')
def preview_refined(request: RefineRequest):

    # How many rows to send back for preview
    N_PREVIEW_ROWS = 10
    
    # Load csv into dataframe
    filepath = str(resolve_file(request.file_ref))
    df = pd.read_csv(filepath, header=0 if request.has_header else None)
    
    if not request.has_header:
        # Rename headers to match frontend
        df.columns = [f"Column {i + 1}" for i in range(len(df.columns))]
    
    # Reduce df to only selected columns
    df = df[request.columns]
    
    # Apply selected NaN strategy
    if request.nan_strategy == "fill":
        df = df.fillna(request.fill_value)

    elif request.nan_strategy == "interpolate":
        df = df.interpolate().bfill().ffill()

    elif request.nan_strategy == "drop":
        df = df.dropna()
        
    # Number of rows available after NaN handling
    available_rows = len(df)
    
    # Slice to requested row range
    start, end = request.row_range
    df = df.iloc[start:end]
    
    preview = df.head(N_PREVIEW_ROWS)
    
    return {"rows": preview.to_dict(orient="records"), "row_count": available_rows}
    
    
        
# def save_refined(file_ref: str, has_header: bool, columns: list[str], ...):
#     df = pd.read_csv(file_ref, header=0 if has_header else None)

#     if not has_header:
#         df.columns = [f"Column {i+1}" for i in range(len(df.columns))]

#     # ...apply column selection, NaN strategy, row range, as already planned...

#     new_ref = save_dataframe(df)  # writes out WITH a header row, always
#     return {"file_ref": new_ref}