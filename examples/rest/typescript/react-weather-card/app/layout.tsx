import type { ReactNode } from "react";

export const metadata = { title: "Weather card" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 24, background: "#f4f6f8" }}>{children}</body>
    </html>
  );
}
