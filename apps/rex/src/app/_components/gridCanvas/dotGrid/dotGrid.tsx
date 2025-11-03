import { type Ref, useMemo, memo, useRef, useEffect, forwardRef } from 'react';
import {
  type FederatedPointerEvent,
  type Geometry,
  type Mesh,
  Shader,
  type Transform,
  UniformGroup,
} from 'pixi.js';
import { dotGridProgram } from '~/app/_components/gridCanvas/dotGrid/dotGrid.shader';
import {
  useGridCanvasStore,
  GRID_CANVAS_BOUND,
} from '~/app/stores/useGridCanvasStore';
import { cardGeometry } from '~/app/_components/gridCanvas/card/card.geometry';

interface DotGridProps {
  isDark: boolean;
  width: number;
  height: number;
  transform: Transform;
  canvasRef: Ref<HTMLDivElement>;
}

export const DotGrid = memo(
  forwardRef<Mesh<Geometry, Shader>, DotGridProps>(
    function DotGrid(props, ref) {
      const { isDark, width, height, transform, canvasRef } = props;

      const canvasSize = useGridCanvasStore(state => state.private.canvasSize);

      const selectionBox = useGridCanvasStore(state => state.selectionBox);

      // TODO: come back and make these real
      const minX = 0;
      const minY = 0;
      const maxX = 0;
      const maxY = 0;

      const boundingBox = useRef([minX, minY, maxX, maxY]);

      useEffect(() => {
        boundingBox.current[0] = minX - GRID_CANVAS_BOUND;
        boundingBox.current[1] = minY - GRID_CANVAS_BOUND;
        boundingBox.current[2] = maxX + GRID_CANVAS_BOUND;
        boundingBox.current[3] = maxY + GRID_CANVAS_BOUND;
      }, [minX, minY, maxX, maxY]); // needed for later when they refer to actual data

      // hybrid reactive/imperative
      const uniforms = useMemo(
        () =>
          new UniformGroup({
            translate: { value: transform.position, type: 'vec2<f32>' },
            scale: { value: transform.scale, type: 'vec2<f32>' },
            pixelRatio: { value: window.devicePixelRatio, type: 'f32' },
            boundingBox: { value: boundingBox.current, type: 'vec4<f32>' },
            canvasSize: { value: canvasSize, type: 'vec2<f32>' },
            selectionBox: { value: selectionBox.state, type: 'vec4<f32>' },
            isDark: { value: isDark ? 1.0 : 0.0, type: 'f32' },
          }),
        [
          transform.position,
          transform.scale,
          boundingBox.current,
          canvasSize,
          selectionBox.state,
        ]
      );

      const dotGridShader = useMemo(
        () =>
          new Shader({
            glProgram: dotGridProgram,
            resources: { uniforms },
          }),
        [uniforms]
      );

      return (
        // biome-ignore lint/a11y/noStaticElementInteractions: ¯\_(ツ)_/¯
        <pixiMesh
          ref={ref}
          geometry={cardGeometry}
          scale={{ x: width, y: height }}
          // @ts-expect-error ¯\_(ツ)_/¯
          shader={dotGridShader}
          visible={true}
          eventMode="static"
          interactiveChildren={false}
          onClick={(e: FederatedPointerEvent) => {}}
          onPointerDown={(e: FederatedPointerEvent) => {}}
          onPointerOver={() => {}}
          onPointerUp={(e: FederatedPointerEvent) => {}}
        />
      );
    }
  )
);
