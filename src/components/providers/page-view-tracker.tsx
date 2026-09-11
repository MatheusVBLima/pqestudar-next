"use client";

import { usePageViewTracker } from "@/hooks/usePageViewTracker";
import { useHeatmapTracker } from "@/hooks/useHeatmapTracker";

/** Headless component: runs usePageViewTracker on every route change. */
export function PageViewTracker() {
  usePageViewTracker();
  useHeatmapTracker();
  return null;
}
