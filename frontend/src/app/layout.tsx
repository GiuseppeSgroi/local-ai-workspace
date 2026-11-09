import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Local AI Workspace",
  description: "Privacy-First Local AI Document Studio",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="it">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", backgroundColor: "#0f172a", color: "#f8fafc" }}>
        {children}
      </body>
    </html>
  );
}