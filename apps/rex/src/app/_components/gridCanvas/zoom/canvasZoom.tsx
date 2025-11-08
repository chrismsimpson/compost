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
        'z-canvas-toolbar fixed top-[66px] right-4 shadow-lg rounded-md border flex items-center justify-center p-2 gap-1 bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-900'
      )}
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <Toggle
            className={cn('group select-none border-0')}
            variant="default"
            onClick={() => zoomOut()}
          >
            <MinusIcon
              className={cn(
                'size-4 stroke-neutral-900 dark:stroke-neutral-400 dark:group-hover:stroke-neutral-300'
              )}
            />
          </Toggle>
        </TooltipTrigger>
        <TooltipContent>Zoom Out</TooltipContent>
      </Tooltip>

      <span className="font-medium text-neutral-600 w-16 text-center dark:text-neutral-400">
        {zoomPercent}%
      </span>

      <Tooltip>
        <TooltipTrigger asChild>
          <Toggle
            className={cn('group select-none border-0')}
            variant="default"
            onClick={() => zoomIn()}
          >
            <PlusIcon
              className={cn(
                'size-4 stroke-neutral-900 dark:stroke-neutral-400 dark:group-hover:stroke-neutral-300'
              )}
            />
          </Toggle>
        </TooltipTrigger>
        <TooltipContent>Zoom In</TooltipContent>
      </Tooltip>
    </div>
  );
};
