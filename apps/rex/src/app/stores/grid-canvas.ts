import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { Transform } from 'pixi.js';
import { Mutable } from '@compost/common/mutable';

export const GRID_CANVAS_BOUND = 1000;

export const BOUNDARY_BUFFER_PX = 80;

export const GRID_CANVAS_MIN_ZOOM = 0.1;
export const GRID_CANVAS_MAX_ZOOM = 16.0;

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

  zoom: number;

  selectionBox: Mutable<[number, number, number, number]>;

  setCanvasSize: (size: [number, number]) => void;

  isFocused: boolean;
  setIsFocused: (focused: boolean) => void;

  zoomCanvas: (d: number, mousePos: { x: number; y: number }) => void;
  scrollCanvas: (dx: number, dy: number) => void;

  zoomIn: () => void;
  zoomOut: () => void;
}

export const useGridCanvasStore = create<GridCanvasState>()(
  subscribeWithSelector((set, get) => {
    const transform = new Transform();

    return {
      private: {
        canvasSize: [0, 0],
      },

      transform,

      zoom: transform.scale.x,

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
        const {
          private: { canvasSize },
          transform,
        } = get();

        const oldZoom = transform.scale.x;
        const newZoom = Math.min(
          Math.max(oldZoom - d, GRID_CANVAS_MIN_ZOOM),
          GRID_CANVAS_MAX_ZOOM
        );
        if (newZoom === oldZoom) return;

        // Anchor zoom to cursor
        const worldMouseX = (mousePos.x - transform.position.x) / oldZoom;
        const worldMouseY = (mousePos.y - transform.position.y) / oldZoom;

        let tx = mousePos.x - worldMouseX * newZoom;
        let ty = mousePos.y - worldMouseY * newZoom;

        // Same bounds as scrollCanvas
        const leftMostX = 0;
        const topMostY = 0;
        const rightMostX = 0;
        const bottomMostY = 0;

        const minX = leftMostX - GRID_CANVAS_BOUND;
        const minY = topMostY - GRID_CANVAS_BOUND;
        const maxX = rightMostX + GRID_CANVAS_BOUND;
        const maxY = bottomMostY + GRID_CANVAS_BOUND;

        const [canvasWidth, canvasHeight] = canvasSize;

        // Clamp to bounds (auto-centers when content fits the viewport)
        tx = clampPanAxis(
          tx,
          newZoom,
          minX,
          maxX,
          canvasWidth,
          BOUNDARY_BUFFER_PX * newZoom
        );

        ty = clampPanAxis(
          ty,
          newZoom,
          minY,
          maxY,
          canvasHeight,
          BOUNDARY_BUFFER_PX * newZoom
        );

        transform.position.set(tx, ty);
        transform.scale.set(newZoom, newZoom);

        set({ zoom: newZoom });
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

      zoomIn: () => {
        const {
          private: { canvasSize },
          transform,
        } = get();

        const canvasCenter: [number, number] = [
          canvasSize[0] / 2,
          canvasSize[1] / 2,
        ];

        const prevZoom = transform.scale.x;

        const newZoom = Math.min(
          Math.max(prevZoom + 0.5, GRID_CANVAS_MIN_ZOOM),
          GRID_CANVAS_MAX_ZOOM
        );

        const translatedX = (canvasCenter[0] - transform.position.x) / prevZoom;
        const translatedY = (canvasCenter[1] - transform.position.y) / prevZoom;

        transform.position.set(
          canvasCenter[0] - translatedX * newZoom,
          canvasCenter[1] - translatedY * newZoom
        );

        transform.scale.set(newZoom, newZoom);

        set({ zoom: newZoom });
      },

      zoomOut: () => {
        const {
          private: { canvasSize },
          transform,
        } = get();

        const canvasCenter: [number, number] = [
          canvasSize[0] / 2,
          canvasSize[1] / 2,
        ];

        const prevZoom = transform.scale.x;

        const newZoom = Math.min(
          Math.max(prevZoom - 0.33 * transform.scale.x, GRID_CANVAS_MIN_ZOOM),
          GRID_CANVAS_MAX_ZOOM
        );

        const translatedX = (canvasCenter[0] - transform.position.x) / prevZoom;
        const translatedY = (canvasCenter[1] - transform.position.y) / prevZoom;

        transform.position.set(
          canvasCenter[0] - translatedX * newZoom,
          canvasCenter[1] - translatedY * newZoom
        );

        transform.scale.set(newZoom, newZoom);

        set({ zoom: newZoom });
      },
    };
  })
);
