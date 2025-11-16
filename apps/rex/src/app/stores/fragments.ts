import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

export type Pin = {
  id: string;
  text: string;
  createdAt: number;
};

export type Attachment = {
  key: string;
  label: string;
  source: 'pin' | 'text';
  pinId?: string;
};

type PinboardState = {
  pins: Pin[];
  attachments: Attachment[];
  draggedPinId: string | null;
};

type PinboardActions = {
  addPin: (text: string) => string;
  deletePin: (id: string) => void;
  movePinByIndex: (from: number, to: number) => void;
  setDraggedPinId: (id: string | null) => void;
  reorderByTarget: (targetPinId: string, position: 'before' | 'after') => void;
  addAttachmentFromPin: (pinId: string) => void;
  addAttachmentFromText: (label: string) => void;
  removeAttachment: (key: string) => void;
  clearAttachments: () => void;
};

export const usePinboardStore = create<PinboardState & PinboardActions>()(
  immer((set, get) => ({
    pins: [],
    attachments: [],
    draggedPinId: null,

    addPin: (text: string) => {
      const id = crypto.randomUUID();
      set(draft => {
        draft.pins.push({ id, text, createdAt: Date.now() });
      });
      return id;
    },

    deletePin: (id: string) => {
      set(draft => {
        draft.pins = draft.pins.filter(p => p.id !== id);
        draft.attachments = draft.attachments.filter(a => a.pinId !== id);
      });
    },

    movePinByIndex: (from: number, to: number) =>
      set(draft => {
        const { pins } = draft;
        const lastIndex = pins.length - 1;

        // guard invalid "from"
        if (from < 0 || from > lastIndex) return;

        // don't mutate the parameter `to`
        let targetIndex = to;
        if (targetIndex < 0) targetIndex = 0;
        if (targetIndex > lastIndex) targetIndex = lastIndex;

        if (from === targetIndex) return;

        // splice can return an empty array; guard that so `item` is not undefined
        const [item] = pins.splice(from, 1);
        if (!item) return;

        pins.splice(targetIndex, 0, item);
      }),

    setDraggedPinId: (id: string | null) => set({ draggedPinId: id }),

    reorderByTarget: (targetPinId: string, position: 'before' | 'after') => {
      const { draggedPinId, pins } = get();
      if (!draggedPinId || draggedPinId === targetPinId) return;

      const from = pins.findIndex(p => p.id === draggedPinId);
      const targetIdx = pins.findIndex(p => p.id === targetPinId);
      if (from === -1 || targetIdx === -1) return;

      let to = position === 'before' ? targetIdx : targetIdx + 1;
      // account for index shift when removing the dragged item
      if (from < to) to -= 1;

      get().movePinByIndex(from, to);
    },

    addAttachmentFromPin: (pinId: string) =>
      set(draft => {
        const pin = draft.pins.find(p => p.id === pinId);
        if (!pin) return;
        const key = `pin:${pinId}`;
        const exists = draft.attachments.some(a => a.key === key);
        if (!exists) {
          draft.attachments.push({
            key,
            label: pin.text,
            source: 'pin',
            pinId,
          });
        }
      }),

    addAttachmentFromText: (label: string) =>
      set(draft => {
        const key = `text:${crypto.randomUUID()}`;
        draft.attachments.push({ key, label, source: 'text' });
      }),

    removeAttachment: (key: string) =>
      set(draft => {
        draft.attachments = draft.attachments.filter(a => a.key !== key);
      }),

    clearAttachments: () =>
      set(draft => {
        draft.attachments = [];
      }),
  }))
);
