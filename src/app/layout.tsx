import type { Metadata } from "next";
import "./globals.css";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "https://pqestudar.com.br";

const SITE_NAME = "PqEstudar";
const DEFAULT_TITLE = "PqEstudar — Curadoria educacional, concursos e ferramentas";
const DEFAULT_DESCRIPTION =
  "Conteúdo organizado para você evoluir mais rápido. Cursos, concursos, ferramentas e curadoria educacional em um só lugar.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: DEFAULT_TITLE,
  },
  description: DEFAULT_DESCRIPTION,
  applicationName: SITE_NAME,
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon.png", type: "image/png" },
    ],
    apple: { url: "/favicon.png" },
  },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: "pt_BR",
    url: SITE_URL,
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    // OG image is auto-resolved from src/app/opengraph-image.tsx (1200x630).
    // Children pages override via their own opengraph-image.tsx or metadata.openGraph.images.
  },
  twitter: {
    card: "summary_large_image",
    site: "@pqestudar",
    creator: "@pqestudar",
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    // Twitter image auto-inherits from openGraph.
  },
  alternates: {
    canonical: "/",
    languages: {
      "pt-BR": "/",
      "x-default": "/",
    },
  } as Metadata["alternates"],
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" data-scroll-behavior="smooth">
      <body>{children}</body>
    </html>
  );
}
