import type { Metadata } from "next";
import { Lato } from "next/font/google";
import "./globals.css";
import { AGENT_LOGO_URLS } from "@/lib/agents";

const lato = Lato({
  variable: "--font-lato",
  weight: ["400", "700", "900"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Slack · Agentic Playground",
  description: "Slack clone with an agentic input surface.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${lato.variable} h-full antialiased`}>
      <head>
        {/* Warm the browser cache for agent logos so the first time a
            suggestion chip mounts, the avatar is already painted. Without
            this, the very first appearance flashes a blank rounded square
            for one frame while the third-party CDN fetch completes. */}
        {AGENT_LOGO_URLS.map((href) => (
          <link key={href} rel="preload" as="image" href={href} />
        ))}
      </head>
      <body className="h-full overflow-hidden bg-slack-rail text-slack-text">
        {children}
      </body>
    </html>
  );
}
