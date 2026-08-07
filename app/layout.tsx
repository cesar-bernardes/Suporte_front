import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") ||
    requestHeaders.get("host") ||
    "localhost:3000";
  const protocol =
    requestHeaders.get("x-forwarded-proto") ||
    (host.includes("localhost") ? "http" : "https");
  const origin = protocol + "://" + host;

  return {
    title: "Portal de Ocorrências | Suporte",
    description:
      "Registro, acompanhamento e análise de ocorrências da operação de suporte.",
    openGraph: {
      title: "Portal de Ocorrências",
      description: "Suporte • visão, registro e catálogo",
      type: "website",
      images: [
        {
          url: origin + "/og.png",
          width: 1731,
          height: 909,
          alt: "Portal de Ocorrências — Suporte",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: "Portal de Ocorrências",
      description: "Suporte • visão, registro e catálogo",
      images: [origin + "/og.png"],
    },
  };
}

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
