import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Gyan Bhandar — A shared shelf for curious minds",
  description: "A thoughtful library of notes, discoveries, and useful things worth passing on.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
