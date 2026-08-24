import type { Metadata } from "next";
import { ensureModeratorAccess } from "@/lib/moderator-guard";
import { ModeratorLayout } from "@/components/moderator/ModeratorLayout";

export const metadata: Metadata = { title: "Moderador | PqEstudar", robots: { index: false, follow: false } };

export default async function Layout({ children }: { children: React.ReactNode }) {
  await ensureModeratorAccess();
  return <ModeratorLayout>{children}</ModeratorLayout>;
}
