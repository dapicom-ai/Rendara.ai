"use client";

import { AssistantRuntimeProvider } from "@assistant-ui/react";
import type { ThreadMessageLike } from "@assistant-ui/react";
import { useRendaraRuntime } from "@/app/lib/use-rendara-runtime";
import { VizChartToolUI, MermaidToolUI, MCPToolCallUI, DashboardToolUI, StoryToolUI, SemanticSchemaToolUI } from "./tool-uis";
import { GenerateQueryToolUI } from "./GenerateQueryToolUI";
import { ExecuteQueryToolUI } from "./ExecuteQueryToolUI";
import { ExpandOverlay } from "@/app/components/viz";

interface ChatProviderProps {
  children: React.ReactNode;
  conversationId?: string;
  initialMessages?: ThreadMessageLike[];
  onConversationCreated?: (id: string) => void;
  onResourceUpdated?: (resourceType: string, resourceId: string) => void;
  resourceId?: string;
}

/**
 * Wraps children with the Rendara assistant runtime provider.
 * Mounts tool UI registrations so they are available to the message renderer.
 */
export function ChatProvider({ children, conversationId, initialMessages, onConversationCreated, onResourceUpdated, resourceId }: ChatProviderProps) {
  const runtime = useRendaraRuntime(conversationId, initialMessages, onConversationCreated, onResourceUpdated, resourceId);

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <VizChartToolUI />
      <MermaidToolUI />
      <DashboardToolUI />
      <StoryToolUI />
      <SemanticSchemaToolUI />
      <GenerateQueryToolUI />
      <ExecuteQueryToolUI />
      <MCPToolCallUI />
      {children}
      <ExpandOverlay />
    </AssistantRuntimeProvider>
  );
}
