import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PqEstudar",
  description:
    "Conteúdo organizado para você evoluir mais rápido. Cursos, concursos, ferramentas e curadoria educacional em um só lugar.",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon.png", type: "image/png" },
    ],
    apple: { url: "/favicon.png" },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
