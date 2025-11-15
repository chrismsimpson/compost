import { z } from 'zod';

// app layer - nodes

export const bbSchema = z.object({
  min_x: z.number(),
  min_y: z.number(),
  max_x: z.number(),
  max_y: z.number(),
});

export const baseShapeSchema = z.object({
  id: z.string(),
  surfaceId: z.string(),
  type: z.literal('shape'),
  x: z.number(),
  y: z.number(),
  z: z.number().nullable(),
  width: z.number(),
  height: z.number(),
  bb: bbSchema,
  stroke: z.string().nullable(),
  fill: z.string().nullable(),
  strokeWidth: z.number().nullable(),
});

export const rectSchema = baseShapeSchema.extend({
  kind: z.literal('rect'),
  rx: z.number().nullable(),
  ry: z.number().nullable(),
});

export type Rect = z.infer<typeof rectSchema>;

export const pathSchema = baseShapeSchema.extend({
  kind: z.literal('path'),
  d: z.string(),
});

export type Path = z.infer<typeof pathSchema>;

export const shapeSchema = z.discriminatedUnion('kind', [
  pathSchema,
  rectSchema,
]);

export type Shape = z.infer<typeof shapeSchema>;

export const toShape = (
  id: string,
  surfaceId: string,
  type: 'shape',
  x: number | null,
  y: number | null,
  z: number | null,
  width: number | null,
  height: number | null,
  min_x: number | null,
  min_y: number | null,
  max_x: number | null,
  max_y: number | null,
  data: ShapeData
): Shape | Error => {
  if (type !== 'shape') {
    return new Error('Invalid type');
  }

  switch (data.kind) {
    case 'rect': {
      if (
        x === null ||
        y === null ||
        width === null ||
        height === null ||
        min_x === null ||
        min_y === null ||
        max_x === null ||
        max_y === null
      ) {
        return new Error('Invalid data for rect');
      }

      return {
        id,
        surfaceId,
        type: 'shape',
        x,
        y,
        z,
        width,
        height,
        bb: {
          min_x,
          min_y,
          max_x,
          max_y,
        },
        stroke: data.stroke,
        fill: data.fill,
        strokeWidth: data.strokeWidth,
        kind: 'rect',
        rx: data.rx,
        ry: data.ry,
      };
    }

    case 'path': {
      if (
        x === null ||
        y === null ||
        width === null ||
        height === null ||
        min_x === null ||
        min_y === null ||
        max_x === null ||
        max_y === null
      ) {
        return new Error('Invalid data for path');
      }

      return {
        id,
        surfaceId,
        type: 'shape',
        x,
        y,
        z,
        width,
        height,
        bb: {
          min_x,
          min_y,
          max_x,
          max_y,
        },
        stroke: data.stroke,
        fill: data.fill,
        strokeWidth: data.strokeWidth,
        kind: 'path',
        d: data.d,
      };
    }

    default: {
      return new Error('Not implemented');
    }
  }
};

///

export const commentSchema = z.object({
  id: z.string(),
  surfaceId: z.string(),
  type: z.literal('comment'),
  x: z.number(),
  y: z.number(),
  text: z.string(),
});

export type Comment = z.infer<typeof commentSchema>;

export const toComment = (
  id: string,
  surfaceId: string,
  type: 'comment',
  x: number | null,
  y: number | null,
  data: CommentData
): Comment | Error => {
  if (type !== 'comment') {
    return new Error('Invalid type');
  }

  if (x === null || y === null) {
    return new Error('Invalid data for comment');
  }

  return {
    id,
    surfaceId,
    type: 'comment',
    x,
    y,
    text: data.text,
  };
};

///

export const nodeSchema = z.discriminatedUnion('type', [
  shapeSchema,
  commentSchema,
]);

export type Node = z.infer<typeof nodeSchema>;

export const toNode = (
  id: string,
  surfaceId: string,
  type: 'shape' | 'comment',
  x: number | null,
  y: number | null,
  z: number | null,
  width: number | null,
  height: number | null,
  min_x: number | null,
  min_y: number | null,
  max_x: number | null,
  max_y: number | null,
  data: NodeData
): Node | Error => {
  switch (type) {
    case 'shape': {
      const shapeData = shapeDataSchema.safeParse(data);

      if (!shapeData.success) {
        return new Error('Invalid shape data');
      }

      return toShape(
        id,
        surfaceId,
        type,
        x,
        y,
        z,
        width,
        height,
        min_x,
        min_y,
        max_x,
        max_y,
        shapeData.data
      );
    }
    case 'comment': {
      const commentData = commentDataSchema.safeParse(data);

      if (!commentData.success) {
        return new Error('Invalid comment data');
      }

      return toComment(id, surfaceId, type, x, y, commentData.data);
    }

    default:
      return new Error('Invalid type');
  }
};

// db layer

export const rectDataSchema = z.object({
  kind: z.literal('rect'),
  stroke: z.string().nullable(),
  fill: z.string().nullable(),
  strokeWidth: z.number().nullable(),
  rx: z.number().nullable(),
  ry: z.number().nullable(),
});

export const pathDataSchema = z.object({
  kind: z.literal('path'),
  stroke: z.string().nullable(),
  fill: z.string().nullable(),
  strokeWidth: z.number().nullable(),
  d: z.string(),
});

export const shapeDataSchema = z.discriminatedUnion('kind', [
  pathDataSchema,
  rectDataSchema,
]);

export type ShapeData = z.infer<typeof shapeDataSchema>;

///

export const commentDataSchema = z.object({
  text: z.string().min(1),
});

export type CommentData = z.infer<typeof commentDataSchema>;

///

export const nodeDataSchema = z.union([shapeDataSchema, commentDataSchema]);

export type NodeData = z.infer<typeof nodeDataSchema>;

///

// app layer - surfaces

export const surfaceSchema = z.object({
  id: z.string(),
  name: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable(),
});

export type Surface = z.infer<typeof surfaceSchema>;
