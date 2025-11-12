import { db } from '@compost/database/database';
import { initTRPC, TRPCError } from '@trpc/server';

import superjson from 'superjson';
import { ZodError } from 'zod';

export const createInnerTRPCContext = () => {
  return {
    db,
  };
};

export const createTRPCContext = async (_opts: { headers: Headers }) => {
  return {
    // opts,
    ...createInnerTRPCContext(),
  };
};

const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

export const createCallerFactory = t.createCallerFactory;

export const createTRPCRouter = t.router;

export const publicProcedure = t.procedure;
