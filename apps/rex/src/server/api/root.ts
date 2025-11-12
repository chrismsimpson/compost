import { createCallerFactory, createTRPCRouter } from '~/server/api/trpc';
import { surfaceRouter } from './routers/surface';

export const appRouter = createTRPCRouter({
  surface: surfaceRouter,
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);
