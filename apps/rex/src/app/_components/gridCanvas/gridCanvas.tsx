'use client';

import { memo, useRef } from 'react';
import { Application, extend } from '@pixi/react';
import { useGridCanvasStore } from '~/app/stores/useGridCanvasStore';

export default memo(function GridCanvas() {
  const componentSize = useGridCanvasStore(
    state => state.private.componentSize
  );

  const ref = useRef<HTMLDivElement>(null);

  return (
    <div ref={ref} className="size-full overflow-hidden">
      <Application width={componentSize[0]} height={componentSize[1]}>
        {/* PixiJS components go here */}
      </Application>
    </div>
  );
});
