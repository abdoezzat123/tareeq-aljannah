import type { Metadata, Viewport } from "next";
import { Cairo, Amiri, Reem_Kufi } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const cairo = Cairo({
  variable: "--font-cairo",
  subsets: ["arabic", "latin"],
  display: "swap",
});

const amiri = Amiri({
  variable: "--font-amiri",
  subsets: ["arabic", "latin"],
  weight: ["400", "700"],
  display: "swap",
});

const reemKufi = Reem_Kufi({
  variable: "--font-reem-kufi",
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "طريقك للجنة | سبحتك إلى الجنة",
  description: "تطبيق إسلامي شامل: سبحه إلكترونية، أذكار الصباح والمساء، مواقيت الصلاة، تذكير كل ساعة، القرآن الكريم كاملاً مع التفسير الصوتي والقرائي",
  keywords: ["قرآن", "تفسير", "أذكار", "مواقيت الصلاة", "سبحة", "تسابيح", "إسلام", "طريقك للجنة"],
  authors: [{ name: "طريقك للجنة" }],
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
  manifest: "/manifest.json",
  openGraph: {
    title: "طريقك للجنة",
    description: "تطبيق إسلامي شامل لكل ما تحتاجه في يومك",
    type: "website",
    locale: "ar_AR",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0f",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body
        className={`${cairo.variable} ${amiri.variable} ${reemKufi.variable} antialiased bg-background text-foreground font-sans`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
