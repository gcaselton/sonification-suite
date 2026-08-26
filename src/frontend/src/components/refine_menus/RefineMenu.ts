
export interface RefineMenuProps {
  dataRef: string;
  dataName?: string;
  isAsterism?: boolean;
  idColumn?: string | null;
  onApply?: (newRef: string, idColumn?: string | null, newRa?: number, newDec?: number) => void;
}
