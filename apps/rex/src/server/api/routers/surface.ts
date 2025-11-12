import { eq, getTableColumns } from '@compost/database/database';
import { Nodes, Surfaces, mapNodes } from '@compost/database/schema';
import { nodeSchema } from '@compost/common/canvas';
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
        // surface: surfaceSchema,
        nodes: z.array(nodeSchema),
      })
    )
    .query(async ({ ctx: { db }, input: { surfaceId } }) => {
      const surfaceRow = await db
        .select(getTableColumns(Surfaces))
        .from(Surfaces)
        .where(eq(Surfaces.id, surfaceId))
        .then(first);

      const nodeRows = await db
        .select(getTableColumns(Nodes))
        .from(Nodes)
        .where(eq(Nodes.surfaceId, surfaceId));

      const nodes = mapNodes(nodeRows);

      if (nodes instanceof Error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: nodes.message,
        });
      }

      return {
        // surface,
        nodes,
      };
    }),
});
