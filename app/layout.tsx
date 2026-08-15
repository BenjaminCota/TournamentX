import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const imageUrl = `${protocol}://${host}/og.png`;

  return {
    title: "TournamentX | Esports & Media",
    description: "Centro de transmisiones, lobbies y métricas competitivas de TournamentX.",
    icons: { icon: "/tournamentx-logo.png", shortcut: "/tournamentx-logo.png" },
    openGraph: {
      title: "TournamentX | Esports & Media",
      description: "Streams, lobbies y métricas competitivas en una sola arena digital.",
      images: [{ url: imageUrl, width: 1792, height: 1024, alt: "TournamentX Esports & Media" }],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: "TournamentX | Esports & Media",
      description: "Streams, lobbies y métricas competitivas en una sola arena digital.",
      images: [imageUrl],
    },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
