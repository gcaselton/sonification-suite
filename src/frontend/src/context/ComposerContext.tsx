import { createContext, useContext, useState, ReactNode } from "react";
import { Layer } from "../types/layers";

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

export function useOptionalComposer() {
  return useContext(ComposerContext);
}