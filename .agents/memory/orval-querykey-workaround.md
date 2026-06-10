---
name: Orval TanStack Query v5 queryKey workaround
description: UseQueryOptions in TanStack Query v5 requires queryKey; Orval-generated hooks accept it as optional but TS complains.
---

## Rule
When passing `query` options (e.g. `refetchInterval`, `enabled`) to Orval-generated hooks, cast the options object with `as any`:

```ts
useGetPool({ query: { refetchInterval: 15000 } as any })
useGetTicket(id, { query: { enabled: !!id, refetchInterval: 15000 } as any })
```

**Why:** TanStack Query v5 changed `UseQueryOptions` to require `queryKey` as a typed field. Orval generates code that provides the queryKey internally (via `getGetPoolQueryKey()`), so it's not needed at the call site — but the TypeScript types still require it. Casting `as any` suppresses the false error without affecting runtime behavior.

**How to apply:** Any time a generated hook needs `refetchInterval`, `enabled`, or other query options in this project.
