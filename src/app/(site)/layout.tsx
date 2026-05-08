import { AppClientProviders } from "@/components/providers/app-client-providers";
import { PublicShellNext } from "@/components/layout/public-shell-next";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppClientProviders>
      <PublicShellNext>{children}</PublicShellNext>
    </AppClientProviders>
  );
}
