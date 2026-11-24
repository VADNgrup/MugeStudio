import type { Metadata } from "next";
import "../lib/styles/globals.css";
import "../lib/styles/editor-interactions.css";
import "../lib/styles/workspace.css";
import "../lib/styles/api-guide.css";
import "../lib/styles/ai-services.css";
import "../lib/styles/generation.css";
import "../lib/styles/timeline-controls.css";

export const metadata: Metadata = {
  title: "MugeStudio — make music, your way",
  description: "An AI-assisted music studio for creating, arranging, and refining your sound.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
