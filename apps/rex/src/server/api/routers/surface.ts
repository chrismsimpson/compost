import {
  sql,
  inArray,
  ne,
  eq,
  and,
  isNull,
  asc,
  desc,
  getTableColumns,
  count,
} from '@compost/database/database';
import {
  Nodes,
  Surfaces,
  mapNodes,
  rowToSurface,
  type SurfaceRow,
} from '@compost/database/schema';
import {
  nodeSchema as commonNodeSchema,
  surfaceSchema,
  type NodeData,
  nodeDataSchema as commonNodeDataSchema,
} from '@compost/common/canvas';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { first, omit } from 'lodash';
import { nodeSchema as storeNodeSchema } from '~/app/stores/grid-canvas';

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
        nodes: z.array(commonNodeSchema),
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
        nodeIds: z.array(z.string().min(1)),
      })
    )
    .output(
      z.object({
        nodes: z.array(commonNodeSchema),
      })
    )
    .query(async ({ ctx: { db }, input: { nodeIds } }) => {
      const nodeRows = await db
        .select(getTableColumns(Nodes))
        .from(Nodes)
        .where(inArray(Nodes.id, nodeIds));

      const nodes = mapNodes(nodeRows);

      if (nodes instanceof Error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: nodes.message,
        });
      }

      const surfaceIds = [...new Set(nodes.map(n => n.surfaceId))];

      if (surfaceIds.length !== 1 || !surfaceIds[0]) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Multiple surfaces found for the given objects',
        });
      }

      return {
        nodes,
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
      z.object({
        surfaceId: z.string().min(1),
        nodes: z.array(storeNodeSchema),
        deletions: z.array(z.string()).optional(),
      })
    )
    .output(
      z.object({
        success: z.boolean(),
      })
    )
    .mutation(async ({ ctx: { db }, input }) => {
      const upserts = input.nodes.flatMap(n => (n.id ? [n.id] : []));

      const [{ count: conflictingIdsCount } = { count: 0 }] = await db
        .select({ count: count() })
        .from(Nodes)
        .where(
          and(inArray(Nodes.id, upserts), ne(Nodes.surfaceId, input.surfaceId))
        );

      if (conflictingIdsCount > 0) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'one or more node IDs already in use',
        });
      }

      if (input.deletions?.length) {
        // TODO: soft delete instead?
        await db.delete(Nodes).where(inArray(Nodes.id, input.deletions));
      }

      if (input.nodes.length) {
        await db
          .insert(Nodes)
          .values(
            input.nodes.map(n => ({
              id: n.id,
              surfaceId: input.surfaceId,
              type: n.type,
              x: n.x,
              y: n.y,
              width: n.type === 'shape' ? n.width : null,
              height: n.type === 'shape' ? n.height : null,
              z: n.type === 'shape' ? n.z : null,
              min_x: n.type === 'shape' ? n.bb.min_x : null,
              min_y: n.type === 'shape' ? n.bb.min_y : null,
              max_x: n.type === 'shape' ? n.bb.max_x : null,
              max_y: n.type === 'shape' ? n.bb.max_y : null,
              data: commonNodeDataSchema.parse(
                omit(n, 'id', 'type', 'x', 'y', 'width', 'height', 'z', 'bb')
              ),
            }))
          )
          .onConflictDoUpdate({
            target: Nodes.id,
            set: {
              data: sql`excluded.data`,
            },
          });
      }

      return {
        success: true,
      };
    }),
});
