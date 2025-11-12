// import GridCanvas from '~/app/_components/gridCanvas/gridCanvas';

'use client';

import dynamic from 'next/dynamic';
import { CanvasZoom } from '~/app/_components/gridCanvas/zoom/canvas-zoom';
import { CanvasToolbar } from '~/app/_components/gridCanvas/toolbar/canvas-toolbar';

const GridCanvas = dynamic(
  () => import('~/app/_components/gridCanvas/grid-canvas'),
  {
    loading: () => (
      <div className="w-full h-full bg-neutral-100 dark:bg-neutral-800" />
    ),
    ssr: false,
  }
);

export default function Page() {
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
