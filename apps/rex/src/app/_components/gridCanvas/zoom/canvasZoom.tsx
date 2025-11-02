'use client';

import { useEffect, useState } from 'react';
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
  const transform = useGridCanvasStore(s => s.transform);
  const [zoomLevel, setZoomLevel] = useState(() => transform.scale.x);

  useEffect(() => {
    let raf = 0;
    let last = transform.scale.x;

    const tick = () => {
      const current = transform.scale.x;
      if (current !== last) {
        last = current;
        setZoomLevel(current);
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [transform]);

  const zoomPercent = (zoomLevel * 100).toFixed(0);

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
            onClick={() => {}}
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
            onClick={() => {}}
          >
            <PlusIcon className={cn('size-4 stroke-zinc-900')} />
          </Toggle>
        </TooltipTrigger>
        <TooltipContent>Zoom In</TooltipContent>
      </Tooltip>
    </div>
  );
};
