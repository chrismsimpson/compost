'use client';

import { useLayoutEffect } from 'react';
import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';
import { CanvasZoom } from '~/app/_components/grid-canvas/zoom/canvas-zoom';
import { CanvasToolbar } from '~/app/_components/grid-canvas/toolbar/canvas-toolbar';
import { useGridCanvasStore } from '~/app/stores/grid-canvas';

const GridCanvas = dynamic(
  () => import('~/app/_components/grid-canvas/grid-canvas'),
  {
    loading: () => (
      <div className="w-full h-full bg-neutral-100 dark:bg-neutral-800" />
    ),
    ssr: false,
  }
);

export default function Page() {
  const { surfaceId } = useParams<{ surfaceId: string }>();

  // biome-ignore lint/correctness/useExhaustiveDependencies: ¯\_(ツ)_/¯
  useLayoutEffect(() => {
    useGridCanvasStore.getState().clearState();

    return () => {
      useGridCanvasStore.getState().clearState();
    };
  }, [surfaceId]);

  return (
    <>
      {/* TODO: dialogs? */}

      <div className="flex h-[calc(100vh-50px)] w-full grow flex-row">
        <div className="flex-1">
          <div className="relative h-full">
            <GridCanvas />
            <CanvasZoom />
            <CanvasToolbar />
          </div>
        </div>
      </div>
    </>
  );
}
