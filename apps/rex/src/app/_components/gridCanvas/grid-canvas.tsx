'use client';

import {
  memo,
  useRef,
  useEffect,
  useState,
  useLayoutEffect,
  type WheelEvent,
} from 'react';
import { Application, extend } from '@pixi/react';
import { useGridCanvasStore } from '~/app/stores/grid-canvas';
import { DotGrid } from '~/app/_components/gridCanvas/dotGrid/dotGrid';
import {
  Matrix,
  type Geometry,
  Mesh,
  type Shader,
  type Application as PixiApp,
} from 'pixi.js';
import { useTheme } from 'next-themes';
import { useParams } from 'next/navigation';
import { api as vanillaApi } from '~/trpc/vanilla';

extend({ Mesh });

export default memo(function GridCanvas() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const canvasSize = useGridCanvasStore(state => state.canvasSize);
  const setCanvasSize = useGridCanvasStore(state => state.setCanvasSize);
  // const transform = useGridCanvasStore(state => state.transform);
  const handleResizeInner = useGridCanvasStore(state => state.handleResize);
  // const zoom = useGridCanvasStore(state => state.zoom);
  const setIsFocused = useGridCanvasStore(state => state.setIsFocused);
  const zoomCanvas = useGridCanvasStore(state => state.zoomCanvas);
  const scrollCanvas = useGridCanvasStore(state => state.scrollCanvas);

  const { surfaceId } = useParams<{ surfaceId: string }>();

  const appRef = useRef<PixiApp | null>(null);

  const ref = useRef<HTMLDivElement>(null);
  const dotGridRef = useRef<Mesh<Geometry, Shader>>(null);

  // const zoomLevel = transform.scale.x;

  const [opacity, setOpacity] = useState(1);

  // measure on mount

  useLayoutEffect(() => {
    const measure = () => {
      if (ref.current) {
        const { width, height } = ref.current.getBoundingClientRect();
        setCanvasSize([width, height]);
      } else {
        setCanvasSize([window.innerWidth, window.innerHeight - 50]); // TODO: derive a const
      }
    };

    measure();

    return () => {
      setIsFocused(false);
    };
  }, [setCanvasSize, setIsFocused]);

  // load init data

  useEffect(() => {
    vanillaApi.surface.getSurfaceData
      .query({
        surfaceId,
      })
      .then(data => {})
      .catch(err => {});
  }, [surfaceId]);

  const handleResize = (_: UIEvent | undefined) => {
    setOpacity(0);

    if (ref.current) {
      const { width, height } = ref.current.getBoundingClientRect();
      setCanvasSize([width, height]);
    }

    setTimeout(() => {
      // const x: number = transform.position.x;
      // const y: number = transform.position.y;

      // transform.setFromMatrix(new Matrix(zoom, 0, 0, zoom, x, y));

      handleResizeInner();

      setOpacity(1);
    }, 50);
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: ¯\_(ツ)_/¯
  useEffect(() => {
    const listener = (e?: UIEvent) => handleResize(e);
    const raf = requestAnimationFrame(() => handleResize(undefined));
    addEventListener('resize', listener);
    return () => {
      cancelAnimationFrame(raf);
      removeEventListener('resize', listener);
    };
  }, []);

  useEffect(() => {
    // refer to tailwind.config.ts for the css
    document.documentElement.classList.add('canvas-mode');
    document.body.classList.add('canvas-mode');
    return () => {
      document.documentElement.classList.remove('canvas-mode');
      document.body.classList.remove('canvas-mode');
    };
  }, []);

  return (
    <div
      ref={ref}
      className="size-full overflow-hidden"
      style={{
        position: 'relative',
        opacity,
      }}
      onWheel={(e: WheelEvent<Element>) => {
        e.preventDefault();

        const isModifier = /Mac|iPod|iPhone|iPad/.test(navigator.userAgent)
          ? e.metaKey
          : e.ctrlKey;

        if (isModifier) {
          const bb = e.currentTarget.getBoundingClientRect();

          const mousePos = { x: e.pageX - bb.left, y: e.pageY - bb.top };

          // zoomCanvas((e.deltaY / 1000.0) * transform.scale.x, mousePos);
          zoomCanvas(e.deltaY / 1000.0, mousePos);
        } else {
          scrollCanvas(-e.deltaX, -e.deltaY);
        }
      }}
    >
      <Application
        eventMode="passive"
        backgroundColor={0xeef1f5}
        antialias={false}
        autoDensity={true}
        resizeTo={ref}
        preference="webgl"
        powerPreference="high-performance"
        resolution={window.devicePixelRatio}
        className="absolute"
        width={canvasSize[0]}
        height={canvasSize[1]}
        onInit={(app: PixiApp) => {
          appRef.current = app;
        }}
      >
        <DotGrid
          ref={dotGridRef}
          isDark={isDark}
          width={canvasSize[0]}
          height={canvasSize[1]}
          // transform={transform}
          canvasRef={ref}
        />
      </Application>
    </div>
  );
});
