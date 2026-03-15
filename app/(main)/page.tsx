import type { Metadata } from "next";
import { HomePageClient } from "./HomePageClient";

export const metadata: Metadata = {
  title: { absolute: "Rendara | AI Data Analysis" },
  description:
    "Start a new conversation with your AI data analyst. Ask questions, explore data, and generate insights in seconds.",
  robots: {
    index: false,
  },
};

export default function HomePage() {
  return <HomePageClient />;
}
