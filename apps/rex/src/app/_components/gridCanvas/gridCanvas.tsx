'use client';

import { memo, useRef, useEffect, useState } from 'react';
import { Application, extend } from '@pixi/react';
import { useGridCanvasStore } from '~/app/stores/useGridCanvasStore';
import { DotGrid } from '~/app/_components/gridCanvas/dotGrid/dotGrid';
import { Matrix, type Geometry, Mesh, type Shader } from 'pixi.js';

export default memo(function GridCanvas() {
  const canvasSize = useGridCanvasStore(state => state.private.canvasSize);
  const setCanvasSize = useGridCanvasStore(state => state.setCanvasSize);

  const transform = useGridCanvasStore(state => state.transform);

  const setIsFocused = useGridCanvasStore(state => state.setIsFocused);

  const ref = useRef<HTMLDivElement>(null);
  const dotGridRef = useRef<Mesh<Geometry, Shader>>(null);

  const zoomLevel = transform.scale.x;

  const [opacity, setOpacity] = useState(1);

  // on mount/unmount
  useEffect(() => {
    setCanvasSize([
      window.innerWidth,
      window.innerHeight - 50, // TODO: derive a const
    ]);

    return () => {
      setIsFocused(false);
    };
  }, []);

  const handleResize = (_: UIEvent | undefined) => {
    setOpacity(0);

    if (ref.current) {
      const { width, height } = ref.current.getBoundingClientRect();
      setCanvasSize([width, height]);
    }

    setTimeout(() => {
      const x: number = transform.position.x;
      const y: number = transform.position.y;

      transform.setFromMatrix(new Matrix(zoomLevel, 0, 0, zoomLevel, x, y));

      setOpacity(1);
    }, 50);
  };

  useEffect(() => {
    addEventListener('resize', handleResize);

    return () => {
      removeEventListener('resize', handleResize);
    };
  });

  extend({ Mesh });

  return (
    <div
      ref={ref}
      className="size-full overflow-hidden"
      style={{
        position: 'relative',
        opacity,
      }}
    >
      <Application width={canvasSize[0]} height={canvasSize[1]}>
        <DotGrid
          ref={dotGridRef}
          canvasRef={ref}
          width={canvasSize[0]}
          height={canvasSize[1]}
          transform={transform}
        />
      </Application>
    </div>
  );
});
