import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AquaLoop AI — Water From Air. Powered Intelligently.",
  description:
    "AquaLoop AI coordinates atmospheric water generators, solar energy, battery storage, and natural gas backup to make decentralized freshwater production smarter and more efficient.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <TooltipProvider delay={150}>{children}</TooltipProvider>
      </body>
    </html>
  );
}
