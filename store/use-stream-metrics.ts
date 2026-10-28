import { create } from "zustand";

type StreamMetricsState = {
  /** Latencia HLS en segundos del reproductor local (null si no hay stream). */
  latencySec: number | null;
  setLatencySec: (value: number | null) => void;
};

export const useStreamMetricsStore = create<StreamMetricsState>((set) => ({
  latencySec: null,
  setLatencySec: (latencySec) => set({ latencySec }),
}));
