import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { Transform } from 'pixi.js';
import { Mutable } from '@compost/common/types/mutable';
import { clamp } from 'lodash';

export interface GridCanvasState {
  private: {
    canvasSize: [number, number];
  };

  transform: Transform;

  selectionBox: Mutable<[number, number, number, number]>;

  setCanvasSize: (size: [number, number]) => void;

  isFocused: boolean;
  setIsFocused: (focused: boolean) => void;

  zoomCanvas: (d: number, mousePos: { x: number; y: number }) => void;
  scrollCanvas: (dx: number, dy: number) => void;
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

      zoomCanvas: (d: number, mousePos: { x: number; y: number }) => {
        const transform = get().transform;

        const oldZoom = transform.scale.x;
        const newZoom = Math.min(Math.max(oldZoom - d, 0.1), 16.0);

        const translatedMouseX = (mousePos.x - transform.position.x) / oldZoom;
        const translatedMouseY = (mousePos.y - transform.position.y) / oldZoom;

        transform.position.set(
          mousePos.x - translatedMouseX * newZoom,
          mousePos.y - translatedMouseY * newZoom
        );

        transform.scale.set(newZoom, newZoom);
      },

      scrollCanvas: (dx: number, dy: number) => {
        const canvasWidth = get().private.canvasSize[0];
        const canvasHeight = get().private.canvasSize[1];

        const leftMostX = 0;
        const topMostY = 0;

        const rightMostX = 0;
        const bottomMostY = 0;

        const transform = get().transform;

        const zoom = transform.scale.x;

        const minX = (leftMostX - 1000) * zoom - canvasWidth * 0.2;
        const maxX = (rightMostX + 1000) * zoom - canvasWidth * 0.8;
        const minY = (topMostY - 1000) * zoom - canvasHeight * 0.2;
        const maxY = (bottomMostY + 1000) * zoom - canvasHeight * 0.8;

        const newX = clamp(-(transform.position.x + dx), minX, maxX);
        const newY = clamp(-(transform.position.y + dy), minY, maxY);

        transform.position.set(-newX, -newY);
      },
    };
  })
);
