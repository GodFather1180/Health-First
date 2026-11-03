import "./globals.css";
import type { Metadata } from "next";
import UiPrefsBoot from "./UiPrefsBoot";

export const metadata: Metadata = {
  title: "Health First",
  description: "Calm goal & healing app",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <UiPrefsBoot />
        {children}
      </body>
    </html>
  );
}
