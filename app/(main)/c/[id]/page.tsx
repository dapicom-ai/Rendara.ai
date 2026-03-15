import type { Metadata } from "next";
import { ConversationLoader } from "@/app/components/chat/ConversationLoader";

interface Props {
  params: Promise<{ id: string }>;
}

export const metadata: Metadata = {
  title: { absolute: "Conversation | Rendara" },
  description: "Active conversation with your AI data analyst.",
  robots: {
    index: false,
  },
};

export default async function ConversationPage({ params }: Props) {
  const { id } = await params;

  return <ConversationLoader conversationId={id} />;
}
