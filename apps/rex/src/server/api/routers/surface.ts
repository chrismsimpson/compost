import {
  eq,
  and,
  isNull,
  asc,
  desc,
  getTableColumns,
} from '@compost/database/database';
import {
  Nodes,
  Surfaces,
  mapNodes,
  rowToSurface,
  type SurfaceRow,
} from '@compost/database/schema';
import { nodeSchema, surfaceSchema } from '@compost/common/canvas';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { first } from 'lodash';

import { createTRPCRouter, publicProcedure } from '~/server/api/trpc';

export const surfaceRouter = createTRPCRouter({
  getSurfaceData: publicProcedure
    .input(
      z.object({
        surfaceId: z.string(),
      })
    )
    .output(
      z.object({
        surface: surfaceSchema,
        nodes: z.array(nodeSchema),
      })
    )
    .query(async ({ ctx: { db }, input: { surfaceId } }) => {
      const surfaceRow = (await db
        .select(getTableColumns(Surfaces))
        .from(Surfaces)
        .where(and(eq(Surfaces.id, surfaceId), isNull(Surfaces.deletedAt)))
        .then(first)) as SurfaceRow | undefined;

      if (!surfaceRow) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `Surface with id ${surfaceId} not found`,
        });
      }

      const surface = rowToSurface(surfaceRow);

      if (surface instanceof Error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: surface.message,
        });
      }

      const nodeRows = await db
        .select(getTableColumns(Nodes))
        .from(Nodes)
        .where(and(eq(Nodes.surfaceId, surfaceId), isNull(Nodes.deletedAt)))
        .orderBy(asc(Nodes.z), desc(Nodes.updatedAt));

      const nodes = mapNodes(nodeRows);

      if (nodes instanceof Error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: nodes.message,
        });
      }

      return {
        surface,
        nodes,
      };
    }),

  getNodes: publicProcedure
    .input(
      z.object({
        surfaceId: z.string(),
      })
    )
    .output(
      z.object({
        success: z.boolean(),
      })
    )
    .query(async ({ ctx: { db }, input: { surfaceId } }) => {
      return {
        success: true,
      };
    }),

  getSurfaces: publicProcedure
    .input(
      z
        .object({
          search: z.string().trim().optional(),
        })
        .optional()
    )
    .output(
      z.object({
        success: z.boolean(),
      })
    )
    .query(async ({ ctx: { db }, input }) => {
      return {
        success: true,
      };
    }),

  createSurface: publicProcedure
    .input(
      z
        .object({
          search: z.string().trim().optional(),
        })
        .optional()
    )
    .output(
      z.object({
        success: z.boolean(),
      })
    )
    .mutation(async ({ ctx: { db }, input }) => {
      return {
        success: true,
      };
    }),

  renameSurface: publicProcedure
    .input(
      z
        .object({
          search: z.string().trim().optional(),
        })
        .optional()
    )
    .output(
      z.object({
        success: z.boolean(),
      })
    )
    .mutation(async ({ ctx: { db }, input }) => {
      return {
        success: true,
      };
    }),

  persistNodes: publicProcedure
    .input(
      z
        .object({
          search: z.string().trim().optional(),
        })
        .optional()
    )
    .output(
      z.object({
        success: z.boolean(),
      })
    )
    .mutation(async ({ ctx: { db }, input }) => {
      return {
        success: true,
      };
    }),
});
