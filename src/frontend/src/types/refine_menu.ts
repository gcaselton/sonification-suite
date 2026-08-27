export interface ApplyResult {
  newRef: string;
  idColumn?: string | null;
  newRa?: number;
  newDec?: number;
  nStars?: number;
}

export interface RefineMenuProps {
  dataRef: string;
  dataName?: string;
  isAsterism?: boolean;
  idColumn?: string | null;
  onApply?: (result: ApplyResult) => void;
}