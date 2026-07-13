import type { Metadata, Viewport } from "next";
import { Cairo, Amiri, Reem_Kufi } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ServiceWorkerRegister } from "@/components/islamic/ServiceWorkerRegister";

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
  metadataBase: new URL("https://preview-chat-b31c54ae-69ff-41ea-a148-1312c26f0d6e.space-z.ai"),
  title: "طريقك للجنة | سبحتك إلى الجنة",
  description: "تطبيق إسلامي شامل: سبحه إلكترونية، أذكار الصباح والمساء، مواقيت الصلاة، تذكير كل ساعة، القرآن الكريم كاملاً مع التفسير الصوتي والقرائي",
  keywords: ["قرآن", "تفسير", "أذكار", "مواقيت الصلاة", "سبحة", "تسابيح", "إسلام", "طريقك للجنة", "Quran", "Islam"],
  authors: [{ name: "طريقك للجنة" }],
  creator: "طريقك للجنة",
  publisher: "طريقك للجنة",
  applicationName: "طريقك للجنة",
  formatDetection: {
    telephone: false,
    address: false,
    email: false,
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "طريقك للجنة",
  },
  icons: {
    icon: [
      { url: "/icon-72.png", sizes: "72x72", type: "image/png" },
      { url: "/icon-96.png", sizes: "96x96", type: "image/png" },
      { url: "/icon-128.png", sizes: "128x128", type: "image/png" },
      { url: "/icon-144.png", sizes: "144x144", type: "image/png" },
      { url: "/icon-152.png", sizes: "152x152", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-384.png", sizes: "384x384", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    shortcut: ["/favicon.ico"],
  },
  manifest: "/manifest.json",
  openGraph: {
    title: "طريقك للجنة",
    description: "تطبيق إسلامي شامل لكل ما تحتاجه في يومك",
    type: "website",
    locale: "ar_AR",
    siteName: "طريقك للجنة",
    images: [{ url: "/icon-512.png", width: 512, height: 512, alt: "طريقك للجنة" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "طريقك للجنة",
    description: "تطبيق إسلامي شامل لكل ما تحتاجه في يومك",
    images: ["/icon-512.png"],
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
        <ServiceWorkerRegister />
        {children}
        <Toaster />
      </body>
    </html>
  );
}
