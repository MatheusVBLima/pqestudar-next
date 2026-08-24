import { AppClientProviders } from "@/components/providers/app-client-providers";

export default function ModeratorRootLayout({ children }: { children: React.ReactNode }) {
  return <AppClientProviders>{children}</AppClientProviders>;
}
