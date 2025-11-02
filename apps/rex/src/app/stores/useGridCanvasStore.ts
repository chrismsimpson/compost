import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { Transform } from 'pixi.js';
import { Mutable } from '@compost/common/types/mutable';
// import { clamp } from 'lodash';

export const GRID_CANVAS_BOUND = 1000;

export const BOUNDARY_BUFFER_PX = 80;

export const DEFAULT_BOUNDS: [number, number, number, number] = [
  -GRID_CANVAS_BOUND,
  -GRID_CANVAS_BOUND,
  GRID_CANVAS_BOUND,
  GRID_CANVAS_BOUND,
];

const clampPanAxis = (
  translate: number,
  scale: number,
  worldMin: number,
  worldMax: number,
  viewport: number,
  bufferPx: number
): number => {
  const content = (worldMax - worldMin) * scale;

  if (content + bufferPx * 2 <= viewport) {
    return (viewport - content) / 2 - worldMin * scale;
  }

  const minTranslate = viewport - bufferPx - worldMax * scale;
  const maxTranslate = bufferPx - worldMin * scale;

  return Math.min(maxTranslate, Math.max(minTranslate, translate));
};

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
        const {
          private: { canvasSize },
          transform,
        } = get();

        const [canvasWidth, canvasHeight] = canvasSize;

        const scale = transform.scale.x;

        const leftMostX = 0;
        const topMostY = 0;
        const rightMostX = 0;
        const bottomMostY = 0;

        const minX = leftMostX - GRID_CANVAS_BOUND;
        const minY = topMostY - GRID_CANVAS_BOUND;
        const maxX = rightMostX + GRID_CANVAS_BOUND;
        const maxY = bottomMostY + GRID_CANVAS_BOUND;

        const tx = clampPanAxis(
          transform.position.x + dx,
          scale,
          minX,
          maxX,
          canvasWidth,
          BOUNDARY_BUFFER_PX * scale
        );

        const ty = clampPanAxis(
          transform.position.y + dy,
          scale,
          minY,
          maxY,
          canvasHeight,
          BOUNDARY_BUFFER_PX * scale
        );

        transform.position.set(tx, ty);
      },
    };
  })
);
