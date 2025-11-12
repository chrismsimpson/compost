import { createTRPCClient, httpBatchStreamLink } from '@trpc/client';
import SuperJSON from 'superjson';

import type { AppRouter } from '~/server/api/root';

import { getBaseUrl } from '~/trpc/common';

export const api = createTRPCClient<AppRouter>({
  links: [
    httpBatchStreamLink({
      transformer: SuperJSON,
      url: `${getBaseUrl()}/api/trpc`,
      headers: () => {
        const headers = new Headers();
        headers.set('x-trpc-source', 'nextjs-react');
        return headers;
      },
    }),
  ],
});
