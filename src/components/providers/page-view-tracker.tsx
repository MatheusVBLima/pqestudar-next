"use client";

import { usePageViewTracker } from "@/hooks/usePageViewTracker";

/** Headless component: runs usePageViewTracker on every route change. */
export function PageViewTracker() {
  usePageViewTracker();
  return null;
}
