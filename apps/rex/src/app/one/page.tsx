// import GridCanvas from '~/app/_components/gridCanvas/gridCanvas';

'use client';

import dynamic from 'next/dynamic';

const GridCanvas = dynamic(
  () => import('~/app/_components/gridCanvas/gridCanvas'),
  {
    loading: () => <div>Loading...</div>,
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
          </div>
        </div>
      </div>
    </>
  );
}
