import { QueryClient } from '@tanstack/react-query';

// Shared React Query client. Retry maps to architecture SLOs (DB CRUD: 2 retries).
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});
