import { createContext, useContext, useState, ReactNode } from "react";

export interface Layer {
  id: string;
  label: string;

  // Data info
  dataName: string | null;
  dataRef: string | null;
  reusedFromLayerId: string | null;
  refined: boolean;

  // Style info
  styleRef: string | null;
  styleName: string | null;
  styleDescription: string | null;

  // Validation
  missingColumns: string[]; // columns mapped in Style but not present in data
  nanColumns: string[]; // columns mapped in Style but contain NaNs
  insufficientColumns: InsufficientColumns | null;
}

// Used if there are more (unnnamed) columns in the Style than there are in the data
interface InsufficientColumns {
  style: number,
  data: number
}

interface ComposerContextValue {
  layers: Layer[];
  setLayers: React.Dispatch<React.SetStateAction<Layer[]>>;
  updateLayer: (id: string, patch: Partial<Layer>) => void;
}

const ComposerContext = createContext<ComposerContextValue | null>(null);

export function ComposerProvider({ children }: { children: ReactNode }) {
  const [layers, setLayers] = useState<Layer[]>([]);

  const updateLayer = (id: string, patch: Partial<Layer>) => {
    setLayers((prev) =>
      prev.map((l) => (l.id === id ? { ...l, ...patch } : l)),
    );
  };

  return (
    <ComposerContext.Provider value={{ layers, setLayers, updateLayer }}>
      {children}
    </ComposerContext.Provider>
  );
}

export function useComposer() {
  const ctx = useContext(ComposerContext);
  if (!ctx) {
    throw new Error("useComposer must be used within a ComposerProvider");
  }
  return ctx;
}