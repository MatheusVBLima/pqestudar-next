"use client";

import { HydrationBoundary, type DehydratedState } from "@tanstack/react-query";

interface QueryHydrationProps {
  children: React.ReactNode;
  state: DehydratedState;
}

export function QueryHydration({ children, state }: QueryHydrationProps) {
  return <HydrationBoundary state={state}>{children}</HydrationBoundary>;
}

