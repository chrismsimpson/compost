import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { Transform } from 'pixi.js';
import { Mutable } from '@compost/common/types/mutable';

export interface GridCanvasState {
  private: {
    canvasSize: [number, number];
  };

  transform: Transform;

  selectionBox: Mutable<[number, number, number, number]>;

  setCanvasSize: (size: [number, number]) => void;

  isFocused: boolean;
  setIsFocused: (focused: boolean) => void;
}

export const useGridCanvasStore = create<GridCanvasState>()(
  subscribeWithSelector((set, get) => {
    const transform = new Transform();

    return {
      private: {
        canvasSize: [0, 0],
      },

      transform,

      selectionBox: new Mutable([0, 0, 0, 0]),

      setCanvasSize: (newSize: [number, number]) => {
        set(state => ({
          private: { ...state.private, canvasSize: newSize },
        }));
      },

      isFocused: false,
      setIsFocused: (focused: boolean) => {
        set({ isFocused: focused });
      },
    };
  })
);
