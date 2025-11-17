'use client';

import { useEffect, useCallback, useRef, useState } from 'react';
import { Badge } from '~/app/_components/shadcn/badge';
import { Card, CardContent } from '~/app/_components/shadcn/card';
import { ScrollArea } from '~/app/_components/shadcn/scroll-area';
import {
  usePinboardStore,
  type Pin,
  type Attachment,
} from '~/app/stores/fragments';

const PinCard = ({ pin, index }: { pin: Pin; index: number }) => {
  const draggedPinId = usePinboardStore(s => s.draggedPinId);
  const setDraggedPinId = usePinboardStore(s => s.setDraggedPinId);
  const reorderByTarget = usePinboardStore(s => s.reorderByTarget);
  const deletePin = usePinboardStore(s => s.deletePin);

  const isDragging = draggedPinId === pin.id;

  const onDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    e.dataTransfer.effectAllowed = 'move';
    setDraggedPinId(pin.id);
    e.dataTransfer.setData('application/x-pin', JSON.stringify({ id: pin.id }));
    e.dataTransfer.setData('text/plain', pin.text);
  };

  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    if (!draggedPinId || draggedPinId === pin.id) return;
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const half = rect.height / 2;
    const position = y < half ? 'before' : 'after';
    reorderByTarget(pin.id, position);
  };

  const onDragEnd = () => {
    setDraggedPinId(null);
  };

  const onClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!e.shiftKey) return;
    e.preventDefault();
    e.stopPropagation();
    deletePin(pin.id);
  };

  return (
    <Card
      className={[
        'p-4 select-none rounded-2xl',
        'cursor-grab active:cursor-grabbing',
        'border-neutral-300 dark:border-chrome-800',
        isDragging ? 'opacity-30' : 'hover:border-chrome-600',
      ].join(' ')}
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onClick={onClick}
      data-pin-id={pin.id}
      data-index={index}
    >
      <CardContent className="p-0">
        <div className="font-sans font-medium text-lg leading-tight break-words whitespace-pre-line dark:text-chrome-300">
          {pin.text}
        </div>
      </CardContent>
    </Card>
  );
};

const PinColumn = () => {
  const pins = usePinboardStore(s => s.pins);

  return (
    <div className="h-full min-h-0">
      <ScrollArea className="h-full">
        <div className="pr-2 pt-2 space-y-2">
          {pins.map((pin, index) => (
            <PinCard key={pin.id} pin={pin} index={index} />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};

const InputDock = () => {
  const [value, setValue] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);

  const addPin = usePinboardStore(s => s.addPin);
  const attachments = usePinboardStore(s => s.attachments);
  const addAttachmentFromPin = usePinboardStore(s => s.addAttachmentFromPin);
  const addAttachmentFromText = usePinboardStore(s => s.addAttachmentFromText);
  const removeAttachment = usePinboardStore(s => s.removeAttachment);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const MAX_ROWS = 5;

  const adjustTextareaHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;

    const cs = window.getComputedStyle(el);
    const lineHeight = Number.parseFloat(cs.lineHeight || '0');
    const paddingTop = Number.parseFloat(cs.paddingTop || '0');
    const paddingBottom = Number.parseFloat(cs.paddingBottom || '0');
    if (!lineHeight) return;

    const maxHeight = lineHeight * MAX_ROWS + paddingTop + paddingBottom;

    el.style.height = 'auto';
    const newHeight = Math.min(el.scrollHeight, maxHeight);
    el.style.height = `${newHeight}px`;
    el.style.overflowY = el.scrollHeight > maxHeight ? 'auto' : 'hidden';
  }, []);

  const handleEnterToPin = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && e.shiftKey) {
      e.preventDefault();
      const text = value.trim();
      if (text.length > 0) {
        addPin(text);
        setValue('');
      }
    }
  };

  const onDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };
  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };
  const onDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  };
  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const pinPayload = e.dataTransfer.getData('application/x-pin');
    if (pinPayload) {
      try {
        const parsed = JSON.parse(pinPayload) as { id: string };
        if (parsed?.id) {
          addAttachmentFromPin(parsed.id);
          textareaRef.current?.focus();
          return;
        }
      } catch {}
    }
    const text = e.dataTransfer.getData('text/plain');
    if (text && text.trim().length > 0) {
      addAttachmentFromText(text.trim());
      textareaRef.current?.focus();
    }
  };

  useEffect(() => {
    const focusTextarea = () => {
      textareaRef.current?.focus();
    };
    focusTextarea();
    window.addEventListener('focus', focusTextarea);
    return () => {
      window.removeEventListener('focus', focusTextarea);
    };
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: ¯\_(ツ)_/¯
  useEffect(() => {
    adjustTextareaHeight();
  }, [value, adjustTextareaHeight]);

  useEffect(() => {
    const onResize = () => adjustTextareaHeight();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [adjustTextareaHeight]);

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: ¯\_(ツ)_/¯
    <div
      className={[
        'mt-4 rounded-2xl border border-neutral-300 bg-white dark:bg-chrome-900 dark:border-chrome-950',
        'p-3 pb-2 mb-4',
        'transition-colors',
        isDragOver ? 'ring-2 ring-neutral-900' : '',
      ].join(' ')}
      onDragEnter={onDragEnter}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {attachments.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-1">
          {attachments.map((a: Attachment) => (
            <Badge
              key={a.key}
              variant="outline"
              className="cursor-pointer text-base dark:text-chrome-400 dark:border-chrome-950"
              title="Click to remove"
              onClick={() => removeAttachment(a.key)}
            >
              <span className="truncate min-w-0 max-w-32">{a.label}</span>
              <span className="ml-2 select-none">×</span>
            </Badge>
          ))}
        </div>
      )}

      <textarea
        ref={textareaRef}
        className={[
          'w-full bg-transparent outline-none m-2',
          'placeholder:text-chrome-700',
          'text-lg leading-tight ',
          'resize-none',
          'overflow-y-auto',
        ].join(' ')}
        placeholder="Make it sing…"
        rows={1}
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={handleEnterToPin}
      />
    </div>
  );
};

export default function Page() {
  return (
    <div className="h-[calc(100vh-50px)] w-full flex justify-center px-4 overflow-hidden dark:bg-chrome-925">
      <div className="w-full max-w-3xl flex flex-col flex-1 min-h-0">
        {/* Top: pin column (scrolls when it hits the input) */}
        <div className="flex-1 min-h-0">
          <PinColumn />
        </div>

        {/* Bottom: large textarea dock */}
        <InputDock />
      </div>
    </div>
  );
}
