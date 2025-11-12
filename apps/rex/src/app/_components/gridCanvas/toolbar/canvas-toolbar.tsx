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
        'z-canvas-toolbar absolute left-4 top-1/2 -translate-y-1/2 bg- shadow-lg rounded-md border flex flex-col items-center justify-center p-2 gap-0.75 bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-900' // VERTICAL LEFT
      )}
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <Toggle
            className={cn('group select-none border-0', {
              'bg-neutral-700 dark:bg-neutral-400 dark:hover:bg-neutral-300':
                cursorMode === 'select',
            })}
            pressed={cursorMode === 'select'}
            variant="default"
            onClick={() => {}}
          >
            <MousePointer2Icon
              className={cn('size-4 stroke-zinc-900', {
                'stroke-neutral-300 dark:stroke-neutral-800':
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
            className={cn(
              'group select-none border-0 bg-neutral-50 dark:bg-neutral-800 dark:hover:bg-neutral-600',
              {
                'bg-zinc-700 ': cursorMode === 'node',
              }
            )}
            pressed={cursorMode === 'node'}
            variant="default"
            onClick={() => {}}
          >
            <SplinePointerIcon
              className={cn(
                'size-4 stroke-neutral-900 dark:stroke-neutral-600 dark:group-hover:stroke-neutral-800',
                {
                  'stroke-neutral-400 dark:stroke-neutral-500':
                    cursorMode === 'node',
                }
              )}
            />
          </Toggle>
        </TooltipTrigger>

        <TooltipContent>Node</TooltipContent>
      </Tooltip>
    </div>
  );
};
