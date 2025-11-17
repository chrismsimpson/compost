import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { Transform } from 'pixi.js';
import { Mutable } from '@compost/common/mutable';
import {
  type Point,
  pointSchema,
  type CanvasCoord,
} from '@compost/common/geometry';
import {
  type Node as CommonNode,
  nodeSchema as commonNodeSchema,
  type CursorMode,
} from '@compost/common/canvas';
import { Matrix } from 'pixi.js';
import { throttle, pick, uniq } from 'lodash';
import { api } from '~/trpc/vanilla';
import { z } from 'zod';
import {
  type Draft,
  type WritableDraft,
  type Patch,
  applyPatches,
  produce,
} from 'immer';

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

// nodes

export const nodeSchema = z.intersection(
  commonNodeSchema,
  z.object({
    selectedBy: z.string().optional(),
    editableBy: z.string().optional(),
    dragLock: z
      .object({
        cursorOffset: pointSchema,
        lockedTo: z.string(),
        dragStart: pointSchema,
      })
      .optional(),
    resizeLock: z
      .object({
        lockedTo: z.string(),
        resizeStart: pointSchema.extend({
          width: z.number(),
          height: z.number(),
        }),
      })
      .optional(),
    hovered: z.boolean().optional(),
  })
);

export type Node = z.infer<typeof nodeSchema>;

// other types

export type Update = {
  patches: Patch[];
  timestamp: number;
  type: 'canvas';
  userId: string;
};

export interface UndoRedoStackItem {
  patches: Patch[];
  inversePatches: Patch[];
}

// helpers

const isPatchUndoable = (patch: Patch): boolean => {
  const nodeId = patch.path[0];

  if (typeof nodeId !== 'string') {
    return false;
  }

  const ignoreList = [
    'dragLock',
    'resizeLock',
    'selectedBy',
    'editableBy',
    'hovered',
  ];

  const lastElement = patch.path[patch.path.length - 1];

  return typeof lastElement !== 'string' || !ignoreList.includes(lastElement);
};

const isPatchBroadcastable = (patch: Patch): boolean => {
  const nodeId = patch.path[0];

  if (typeof nodeId !== 'string') {
    return false;
  }

  const ignoreList = ['selectedBy', 'hovered'];

  const lastElement = patch.path[patch.path.length - 1];

  return typeof lastElement !== 'string' || !ignoreList.includes(lastElement);
};

// store

export interface GridCanvasState {
  surfaceId?: string;
  clientId?: string;

  canvasSize: [number, number];

  heldKey: Record<string, boolean>;
  setHeldKey: (keyCode: string, isHeld: boolean) => void;

  // TODO: cursor override?

  cursorPosition: Transform;
  scrollVelocity: Point;

  position: Point;
  scale: Point;

  nodes: Record<string, Node>;

  nodesToPersist: string[];

  history: Update[];

  undoStack: UndoRedoStackItem[];
  redoStack: UndoRedoStackItem[];

  handleResize: () => void;

  selectionBox: Mutable<[number, number, number, number]>;

  isSelecting: Mutable<boolean>;

  setCanvasSize: (size: [number, number]) => void;

  isFocused: boolean;
  setIsFocused: (focused: boolean) => void;

  zoomCanvas: (d: number, mousePos: { x: number; y: number }) => void;
  scrollCanvas: (dx: number, dy: number) => void;

  zoomIn: () => void;
  zoomOut: () => void;

  isBroadcasting: Mutable<boolean>;

  broadcastUpdate: (update: Update) => void;
  broadcastCursor: (update: { x: number; y: number }) => void;
  setBroadcastUpdate: (fn: (update: Update) => void) => void;
  setBroadcastCursor: (fn: (update: { x: number; y: number }) => void) => void;

  command: (action: GridCanvasAction) => void;

  persistUpdate: (update: Update) => void;

  handleRemoteUpdate: (update: Update) => void;

  undo: () => void;
  redo: () => void;

  clearState: () => void;
}

export const useGridCanvasStore = create<GridCanvasState>()(
  subscribeWithSelector((set, get) => {
    const transform = new Transform();

    const setPositionInner = (x: number, y: number) => {
      transform.position.set(x, y);

      set({ position: { x, y } });
    };

    const setPositionAndScaleInner = (
      x: number,
      y: number,
      scaleX: number,
      scaleY: number
    ) => {
      transform.position.set(x, y);
      transform.scale.set(scaleX, scaleY);

      set({ position: { x, y }, scale: { x: scaleX, y: scaleY } });
    };

    return {
      surfaceId: undefined,
      clientId: undefined,

      canvasSize: [0, 0],

      heldKey: {},

      setHeldKey(keyCode: string, isHeld: boolean) {
        set(state =>
          produce(state, draft => {
            if (isHeld) draft.heldKey[keyCode] = true;
            else delete draft.heldKey[keyCode];
          })
        );
      },

      cursorPosition: new Transform(),
      scrollVelocity: { x: 0, y: 0 },

      position: { x: transform.position.x, y: transform.position.y },
      scale: { x: transform.scale.x, y: transform.scale.y },

      nodes: {},

      nodesToPersist: [],

      history: [],

      undoStack: [],
      redoStack: [],

      handleResize: () => {
        const x: number = transform.position.x;
        const y: number = transform.position.y;
        transform.setFromMatrix(
          new Matrix(transform.scale.x, 0, 0, transform.position.x, x, y)
        );
      },

      selectionBox: new Mutable([0, 0, 0, 0]),

      isSelecting: new Mutable(false),

      setCanvasSize: (newSize: [number, number]) => {
        set({
          canvasSize: newSize,
        });
      },

      isFocused: false,
      setIsFocused: (focused: boolean) => {
        set({ isFocused: focused });
      },

      zoomCanvas: (_d: number, mousePos: { x: number; y: number }) => {
        const {
          canvasSize,
          // transform
        } = get();

        const d = _d * transform.scale.x;

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

        setPositionAndScaleInner(tx, ty, newZoom, newZoom);
      },

      scrollCanvas: (dx: number, dy: number) => {
        const { canvasSize } = get();

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

        setPositionInner(tx, ty);
      },

      zoomIn: () => {
        const { canvasSize } = get();

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

        setPositionAndScaleInner(
          canvasCenter[0] - translatedX * newZoom,
          canvasCenter[1] - translatedY * newZoom,
          newZoom,
          newZoom
        );
      },

      zoomOut: () => {
        const { canvasSize } = get();

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

        setPositionAndScaleInner(
          canvasCenter[0] - translatedX * newZoom,
          canvasCenter[1] - translatedY * newZoom,
          newZoom,
          newZoom
        );
      },

      isBroadcasting: new Mutable(false),

      broadcastUpdate: _ => {
        'no op';
      },

      broadcastCursor: _ => {
        'no op';
      },

      setBroadcastUpdate: fn =>
        set(_ => ({
          broadcastUpdate: fn,
        })),

      setBroadcastCursor: fn =>
        set(_ => ({
          broadcastCursor: throttle(fn, 1000 / 12),
        })),

      command: (action: GridCanvasAction) => {
        const state = get();

        if (!state.clientId) return;

        const actor = state.clientId;

        if (!actor) return;

        const formulateUpdate = (patches: Patch[]): Update => ({
          patches,
          userId: actor,
          timestamp: new Date().getTime(),
          type: 'canvas',
        });

        const formulateUndo = (
          patches: Patch[],
          inversePatches: Patch[]
        ): UndoRedoStackItem | undefined => {
          const filteredPatches = patches.filter(isPatchUndoable);

          const filteredInversePatches = inversePatches.filter(isPatchUndoable);

          if (
            filteredPatches.length === 0 &&
            filteredInversePatches.length === 0
          ) {
            return undefined;
          }

          return {
            patches: filteredPatches,
            inversePatches: filteredInversePatches,
          } satisfies UndoRedoStackItem;
        };

        const executeChanges = (patches: Patch[], inversePatches: Patch[]) => {
          if (patches.length === 0) return;

          const update: Update = formulateUpdate(patches);
          const undoStackItem = formulateUndo(patches, inversePatches);

          if (
            state.isBroadcasting.value &&
            update.patches.filter(isPatchBroadcastable).length > 0
          ) {
            state.broadcastUpdate({
              ...update,
              patches: update.patches.filter(isPatchBroadcastable),
            });
          }

          state.persistUpdate(update);

          set(state => {
            return {
              objects: applyPatches(state.nodes, patches),
              history: [...state.history, update],
              undoStack: undoStackItem
                ? [...state.undoStack, undoStackItem]
                : state.undoStack,
            };
          });
        };

        produce(
          state.nodes,
          reducer(action, actor, state, set),
          executeChanges
        );
      },

      persistUpdate(update: Update) {
        const changes = uniq(
          update.patches.map(p => p.path[0]).filter(p => typeof p === 'string')
        );

        set(state => ({
          nodesToPersist: uniq([...state.nodesToPersist, ...changes]),
          nodes: applyPatches(state.nodes, update.patches),
        }));

        persistUpdates(get(), set).catch(console.error);
      },

      handleRemoteUpdate: (update: Update) => {
        const updates = uniq(update.patches.map(x => x.path[0])).filter(
          x => typeof x === 'string'
        );

        const tracked = Object.keys(get().nodes);

        const missing = updates.filter(x => tracked.indexOf(x) === -1);

        if (missing.length > 0) {
          api.surface.getNodes
            .query({ nodeIds: missing })
            .then(data => {
              console.log('there were missing node ids', missing);

              for (const node of data.nodes) {
                console.log('resolved missing node from db', node);

                if (node?.id) {
                  set(state => {
                    const dbVersion = { ...state.nodes };
                    dbVersion[node.id] = node as Node;
                    return {
                      nodes: dbVersion,
                    };
                  });
                }
              }
            })
            .catch(console.error);
        }

        try {
          set(state => ({
            nodes: applyPatches(state.nodes, update.patches),
            history: [...state.history, update],
          }));
        } catch (e) {
          console.error(e);
        }
      },

      undo: () => {
        set(state => {
          if (!state.clientId) {
            return state; // do not update without clientId
          }

          const user = state.clientId;

          const lastUndo = [...state.undoStack].pop();

          if (!lastUndo) {
            return state;
          }

          try {
            const patches = applyPatches(state.nodes, lastUndo.inversePatches);

            const update: Update = {
              patches: lastUndo.inversePatches,
              userId: user,
              timestamp: Date.now(),
              type: 'canvas',
            };

            state.broadcastUpdate({
              ...update,
              patches: update.patches.filter(isPatchBroadcastable),
            });

            state.persistUpdate(update);

            return {
              objects: patches,
              history: [...state.history, update],

              undoStack: state.undoStack.slice(0, -1),
              redoStack: [...state.redoStack, lastUndo],
            };
          } catch {
            console.error('patches could not be applied');

            return {
              undoStack: state.undoStack.slice(0, -1),
            };
          }
        });
      },

      redo: () => {
        set(state => {
          if (!state.clientId) {
            return state; // do not update without clientId
          }

          const user = state.clientId;

          const lastRedo = [...state.redoStack].pop();

          if (!lastRedo) return state;

          try {
            // fail early
            const patches = applyPatches(state.nodes, lastRedo.patches);

            const update: Update = {
              patches: lastRedo.patches,
              userId: user,
              timestamp: Date.now(),
              type: 'canvas',
            };

            state.broadcastUpdate({
              ...update,
              patches: update.patches.filter(isPatchBroadcastable),
            });

            state.persistUpdate(update);

            return {
              nodes: patches,
              history: [...state.history, update],

              // pop last of redo stack
              redoStack: state.redoStack.slice(0, -1),
              undoStack: [...state.undoStack, lastRedo],
            };
          } catch {
            return {
              redoStack: state.redoStack.slice(0, -1),
            };
          }
        });
      },

      clearState: () => {
        set({
          heldKey: {},
          nodes: {},
          nodesToPersist: [],
          history: [],
          undoStack: [],
          redoStack: [],
        });
      },
    };
  })
);

// persistance

export const persistUpdates = throttle(
  async (
    { surfaceId, nodes, nodesToPersist }: GridCanvasState,
    set: typeof useGridCanvasStore.setState
  ) => {
    if (!surfaceId) return;

    if (nodesToPersist.length === 0) return;

    const upserts = nodesToPersist.filter(
      id => Object.keys(nodes).indexOf(id) !== -1
    );

    const deletions = nodesToPersist.filter(
      id => Object.keys(nodes).indexOf(id) === -1
    );

    set(_ => ({
      nodesToPersist: [],
    }));

    await api.surface.persistNodes.mutate({
      surfaceId,
      nodes: Object.values(pick(nodes, upserts)),
      deletions,
    });
  },
  300
);

// actions

export type GridCanvasAction =
  | {
      type: 'clicked_grid';
      payload: {
        coord: CanvasCoord;
        cursorMode: CursorMode;
      };
    }
  | {
      type: 'pointer_down_grid';
      payload: {
        coord: CanvasCoord;
        cursorMode: CursorMode;
      };
    }
  | {
      type: 'pointer_up_grid';
      payload: {
        coord: CanvasCoord;
        cursorMode: CursorMode;
      };
    };

// reducer

function reducer(
  /** The action performed defined as a js object */
  action: GridCanvasAction,
  /** Who performed the action */
  actor: string,
  /** Current canvas cards state */
  state: GridCanvasState,
  /** Access to set the current state only for use with non-synced state */
  setState: typeof useGridCanvasStore.setState
): (draft: Draft<Record<string, Node>>) => void {
  switch (action.type) {
    case 'pointer_down_grid': {
      Object.assign(state.selectionBox.value, [
        action.payload.coord.x,
        action.payload.coord.y,
        0,
        0,
      ]);

      state.isSelecting.value = true;

      return _ => {
        null;
      };
    }

    case 'pointer_up_grid': {
      return draft => {
        const userIsEditing = Object.values(draft).some(
          n => n.editableBy === actor
        );

        if (
          !userIsEditing &&
          state.isSelecting.value &&
          state.selectionBox.value[2] === 0 &&
          state.selectionBox.value[3] === 0
        ) {
          for (const nodeId in draft) {
            const node = draft?.[nodeId];
            if (node?.selectedBy === actor) {
              node.selectedBy = undefined;
            }
          }
        }

        Object.assign(state.selectionBox.value, [0, 0, 0, 0]);

        state.isSelecting.value = false;

        // useUIStore.getState().setCursorMode('select');
      };
    }

    case 'clicked_grid': {
      return draft => {
        if (Object.values(draft).find(n => n.editableBy === actor)) {
          for (const nodeId in draft) {
            const node = draft[nodeId];

            if (node?.editableBy === actor && node.type === 'comment') {
              delete draft[nodeId];
            }

            if (node?.editableBy === actor) {
              node.editableBy = undefined;
            }
          }
        }
      };
    }
  }
}
