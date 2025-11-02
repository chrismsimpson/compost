import { cn } from '~/app/lib/cn';
import { MousePointer2Icon, SplinePointerIcon } from 'lucide-react';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '~/app/_components/shadcn/tooltip';
import { Toggle } from '~/app/_components/shadcn/toggle';
import { useState } from 'react';

export const CanvasToolbar = () => {
  type Cursor = 'select' | 'node';

  const [cursorMode, _] = useState<Cursor>('select');

  return (
    <div
      className={cn(
        // 'z-canvas-toolbar absolute bottom-8 left-1/2 -translate-x-1/2 bg-white shadow-lg rounded-md border border-gray-200 flex items-center justify-center p-2 gap-0.75' // HORIZONTAL BOTTOM
        'z-canvas-toolbar absolute left-4 top-1/2 -translate-y-1/2 bg-white shadow-lg rounded-md border border-gray-200 flex flex-col items-center justify-center p-2 gap-0.75' // VERTICAL LEFT
      )}
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <Toggle
            className={cn('group select-none border-0', {
              'bg-zinc-700 hover:bg-zinc-500': cursorMode === 'select',
            })}
            pressed={cursorMode === 'select'}
            variant="default"
            onClick={() => {}}
          >
            <MousePointer2Icon
              className={cn('size-4 stroke-zinc-900', {
                'stroke-neutral-400 group-hover:stroke-neutral-300':
                  cursorMode === 'select',
              })}
            />
          </Toggle>
        </TooltipTrigger>

        <TooltipContent>Select</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Toggle
            className={cn('group select-none border-0', {
              'bg-zinc-700 hover:bg-zinc-500': cursorMode === 'node',
            })}
            pressed={cursorMode === 'node'}
            variant="default"
            onClick={() => {}}
          >
            <SplinePointerIcon
              className={cn('size-4 stroke-zinc-900', {
                'stroke-neutral-400 group-hover:stroke-neutral-300':
                  cursorMode === 'node',
              })}
            />
          </Toggle>
        </TooltipTrigger>

        <TooltipContent>Select</TooltipContent>
      </Tooltip>
    </div>
  );
};
