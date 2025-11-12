import { z } from 'zod';

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
  text: z.string(),
});

export type CommentData = z.infer<typeof commentDataSchema>;

///

export const nodeDataSchema = z.union([shapeDataSchema, commentDataSchema]);

export type NodeData = z.infer<typeof nodeDataSchema>;

///

// app layer

export const bbSchema = z.object({
  min_x: z.number(),
  min_y: z.number(),
  max_x: z.number(),
  max_y: z.number(),
});

export const baseShapeSchema = z.object({
  type: z.string(),
  x: z.number(),
  y: z.number(),
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
  type: 'shape',
  x: number | null,
  y: number | null,
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
        max_y === null ||
        data.kind !== 'rect'
      ) {
        return new Error('Invalid data for rect');
      }

      return {
        type: 'shape',
        x,
        y,
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
        max_y === null ||
        data.kind !== 'path'
      ) {
        return new Error('Invalid data for path');
      }

      return {
        type: 'shape',
        x,
        y,
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
  type: z.string(),
  x: z.number(),
  y: z.number(),
  text: z.string(),
});

export type Comment = z.infer<typeof commentSchema>;

export const toComment = (
  type: 'comment',
  x: number | null,
  y: number | null,
  data: CommentData
): Comment | Error => {
  if (type !== 'comment') {
    return new Error('Invalid type');
  }

  if (x === null || y === null || !data.text) {
    return new Error('Invalid data for comment');
  }

  return {
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
  type: 'shape' | 'comment',
  x: number | null,
  y: number | null,
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
        type,
        x,
        y,
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

      return toComment(type, x, y, commentData.data);
    }

    default:
      return new Error('Invalid type');
  }
};
