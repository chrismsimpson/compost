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
        // 'z-canvas-toolbar absolute bottom-8 left-1/2 -translate-x-1/2 bg-white shadow-lg rounded-md border border-chrome-200 flex items-center justify-center p-2 gap-0.75' // HORIZONTAL BOTTOM
        'z-canvas-toolbar absolute left-4 top-1/2 -translate-y-1/2 bg- shadow-lg rounded-md border flex flex-col items-center justify-center p-2 gap-1.5 bg-chrome-50 dark:bg-chrome-925 border-chrome-200 dark:border-chrome-950' // VERTICAL LEFT
      )}
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <Toggle
            className={cn('group select-none border-0', {
              'bg-chrome-700 dark:bg-chrome-400 dark:hover:bg-chrome-300':
                cursorMode === 'select',
            })}
            pressed={cursorMode === 'select'}
            variant="default"
            onClick={() => {}}
          >
            <MousePointer2Icon
              className={cn('size-4 stroke-chrome-900', {
                'stroke-chrome-300 dark:stroke-chrome-800':
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
              'group select-none border-0 bg-chrome-50 dark:bg-chrome-800 dark:hover:bg-chrome-600',
              {
                'bg-chrome-700 ': cursorMode === 'node',
              }
            )}
            pressed={cursorMode === 'node'}
            variant="default"
            onClick={() => {}}
          >
            <SplinePointerIcon
              className={cn(
                'size-4 stroke-chrome-900 dark:stroke-chrome-600 dark:group-hover:stroke-chrome-800',
                {
                  'stroke-chrome-400 dark:stroke-chrome-500':
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
