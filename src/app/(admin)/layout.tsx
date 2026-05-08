import { AppClientProviders } from "@/components/providers/app-client-providers";

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return <AppClientProviders>{children}</AppClientProviders>;
}
