import { z } from 'zod';

// export const commentNodeDataSchema = z.object({});

// export type CommentNode = z.infer<typeof commentNodeDataSchema>;

export const textNodeDataSchema = z.object({
  kind: z.literal('text'),
  text: z.string(),
});

export type TextNode = z.infer<typeof textNodeDataSchema>;

export const imageNodeDataSchema = z.object({
  kind: z.literal('image'),
  uri: z.string(),
});

export type ImageNode = z.infer<typeof imageNodeDataSchema>;

export const shapeNodeDataSchema = z.object({
  kind: z.literal('shape'),
  type: z.enum(['path']),
});

export type ShapeNode = z.infer<typeof shapeNodeDataSchema>;

export const nodeDataSchema = z.discriminatedUnion('type', [
  // commentNodeDataSchema,
  textNodeDataSchema,
  shapeNodeDataSchema,
  imageNodeDataSchema,
]);

export type NodeData = z.infer<typeof nodeDataSchema>;
