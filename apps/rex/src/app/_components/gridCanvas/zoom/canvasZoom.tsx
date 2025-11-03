'use client';

import { cn } from '~/app/lib/cn';
import { useGridCanvasStore } from '~/app/stores/useGridCanvasStore';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '~/app/_components/shadcn/tooltip';
import { Toggle } from '~/app/_components/shadcn/toggle';
import { MinusIcon, PlusIcon } from 'lucide-react';

export const CanvasZoom = () => {
  const zoom = useGridCanvasStore(s => s.zoom);

  const zoomIn = useGridCanvasStore(state => state.zoomIn);
  const zoomOut = useGridCanvasStore(state => state.zoomOut);

  const zoomPercent = (zoom * 100).toFixed(0);

  return (
    <div
      className={cn(
        'z-canvas-toolbar fixed top-4 right-4 bg-white shadow-lg rounded-md border border-gray-200 flex items-center justify-center p-2 gap-1'
      )}
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <Toggle
            className={cn('group select-none border-0')}
            variant="default"
            onClick={() => zoomOut()}
          >
            <MinusIcon className={cn('size-4 stroke-zinc-900')} />
          </Toggle>
        </TooltipTrigger>
        <TooltipContent>Zoom Out</TooltipContent>
      </Tooltip>

      <span className="font-medium text-gray-600 w-16 text-center">
        {zoomPercent}%
      </span>

      <Tooltip>
        <TooltipTrigger asChild>
          <Toggle
            className={cn('group select-none border-0')}
            variant="default"
            onClick={() => zoomIn()}
          >
            <PlusIcon className={cn('size-4 stroke-zinc-900')} />
          </Toggle>
        </TooltipTrigger>
        <TooltipContent>Zoom In</TooltipContent>
      </Tooltip>
    </div>
  );
};
