import type { Metadata } from "next";
import { Bebas_Neue, DM_Sans } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";

const display = Bebas_Neue({ variable: "--font-display", subsets: ["latin"], weight: "400" });
const sans = DM_Sans({ variable: "--font-sans", subsets: ["latin"] });

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "relogio-rho-ten.vercel.app";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");
  const origin = `${protocol}://${host}`;
  return {
    metadataBase: new URL(origin),
    title: { default: "Almare | Relógios masculinos", template: "%s | Almare" },
    description: "Relógios masculinos com design urbano, garantia de 30 dias e envio imediato.",
    icons: { icon: "/almare-icon.png", shortcut: "/almare-icon.png", apple: "/almare-icon.png" },
    openGraph: { type: "website", locale: "pt_BR", siteName: "Almare", title: "Almare — Seu tempo. Sua presença.", description: "Relógios masculinos com design urbano, garantia de 30 dias e envio imediato.", images: [{ url: `${origin}/og.png`, width: 1200, height: 630, alt: "Almare — Seu tempo. Sua presença." }] },
    twitter: { card: "summary_large_image", title: "Almare — Seu tempo. Sua presença.", description: "Relógios masculinos com design urbano e envio imediato.", images: [`${origin}/og.png`] },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body className={`${display.variable} ${sans.variable}`}>{children}</body>
    </html>
  );
}
