import { z } from 'zod';

export const pointSchema = z.object({
  x: z.number(),
  y: z.number(),
});

export type Point = z.infer<typeof pointSchema>;

export const canvasCoordSchema = pointSchema.extend({
  space: z.literal('canvas'),
});

export type CanvasCoord = z.infer<typeof canvasCoordSchema>;

export const domCoordSchema = pointSchema.extend({
  space: z.literal('dom'),
});

export type DOMCoord = z.infer<typeof domCoordSchema>;

export const screenCoordSchema = pointSchema.extend({
  space: z.literal('screen'),
});

export type ScreenCoord = z.infer<typeof screenCoordSchema>;
