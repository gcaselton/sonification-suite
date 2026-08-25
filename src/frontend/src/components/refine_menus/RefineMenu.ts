
export interface RefineMenuProps {
  dataRef: string;
  dataName?: string;
  isAsterism?: boolean;
  onApply?: (newRef: string, newRa?: number, newDec?: number) => void;
}
