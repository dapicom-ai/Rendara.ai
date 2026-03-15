import type { Metadata } from "next";
import { Sidebar } from "@/components/layout/sidebar";
import { PinModalPortal } from "@/app/components/layout/PinModalPortal";
import { ExpandOverlay } from "@/app/components/viz/ExpandOverlay";

// Metadata for all routes under (main)
export const metadata: Metadata = {
  robots: {
    index: false,
  },
};

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-dvh overflow-hidden">
      {/* Skip to main content link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only absolute z-50"
      >
        Skip to main content
      </a>
      <Sidebar />
      <main id="main-content" className="flex-1 overflow-hidden pl-12">
        {children}
      </main>
      <PinModalPortal />
      <ExpandOverlay />
    </div>
  );
}
