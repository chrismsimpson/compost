import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

import { Transform } from 'pixi.js';

export interface GridCanvasState {
  private: {
    componentSize: [number, number];
  };

  isFoo?: boolean;
  setIsFoo: (isFoo: boolean) => void;
}

export const useGridCanvasStore = create<GridCanvasState>()(
  subscribeWithSelector((set, get) => {
    const transform = new Transform();

    return {
      private: {
        componentSize: [0, 0],
      },
      isFoo: false,
      setIsFoo: (isFoo: boolean) => set({ isFoo }),
    };
  })
);
