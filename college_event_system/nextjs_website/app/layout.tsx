import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "LTSU Events",
    template: "%s | LTSU Events",
  },
  description:
    "Secure College Event Management System — Lamrin Tech Skills University. Register for events, manage clubs, track duty leaves, and more.",
  keywords: [
    "LTSU",
    "Lamrin Tech Skills University",
    "college events",
    "event management",
    "student portal",
  ],
  authors: [{ name: "LTSU Events Team" }],
  creator: "Lamrin Tech Skills University",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
  ),
  openGraph: {
    type: "website",
    locale: "en_IN",
    siteName: "LTSU Events",
    title: "LTSU Events — College Event Management System",
    description:
      "Manage college events, clubs, duty leaves, and payments — all in one secure platform.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider
      appearance={{
        variables: {
          colorPrimary: "hsl(221.2, 83.2%, 53.3%)",
          colorBackground: "hsl(0, 0%, 100%)",
          colorText: "hsl(222.2, 84%, 4.9%)",
          borderRadius: "0.5rem",
          fontFamily: "var(--font-inter), system-ui, sans-serif",
        },
        elements: {
          formButtonPrimary:
            "bg-primary hover:bg-primary/90 text-primary-foreground",
          card: "shadow-card-lg border border-border",
          headerTitle: "text-foreground font-bold",
          headerSubtitle: "text-muted-foreground",
          socialButtonsBlockButton:
            "border border-border bg-background hover:bg-accent text-foreground",
          formFieldInput:
            "border border-input bg-background text-foreground focus:ring-2 focus:ring-ring",
          footerActionLink: "text-primary hover:text-primary/80",
          identityPreviewEditButton: "text-primary hover:text-primary/80",
        },
      }}
    >
      <html lang="en" suppressHydrationWarning>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <link rel="icon" href="/favicon.ico" sizes="any" />
        </head>
        <body className={`${inter.variable} font-sans antialiased`}>
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
