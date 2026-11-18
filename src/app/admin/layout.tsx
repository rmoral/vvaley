import type { Metadata } from "next";
import { fraunces, jakarta } from "@/fonts";
import "../../styles/globals.css";
import {
  GoogleTagManager,
  GoogleTagManagerNoScript,
} from "@/components/GoogleTagManager";

export const metadata: Metadata = {
  title: "Backoffice · Valira Valley",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={`${fraunces.variable} ${jakarta.variable}`}>
      <body className="bg-bg2">
        <GoogleTagManager />
        <GoogleTagManagerNoScript />
        {children}
      </body>
    </html>
  );
}
