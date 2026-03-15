// API Request/Response Types (SDD Section 10)

import type { ContentBlock } from "./content-blocks";

// ---------------------------------------------------------------
// Chat endpoint (SDD Section 10.1)
// ---------------------------------------------------------------

export interface ChatStreamRequest {
  conversation_id: string;
  message: string;
  new_conversation: boolean;
}

// ---------------------------------------------------------------
// Data model types (SDD Section 9)
// ---------------------------------------------------------------

export interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: "user" | "assistant";
  content: string | ContentBlock[]; // JSON serialised in storage; parsed array in-memory
  created_at: string;
}

export interface Dashboard {
  id: string;
  title: string;
  layoutJson: DashboardTile[];
  tileCount: number;
  created_at: string;
  updated_at: string;
}

export interface DashboardTile {
  id: string;
  type: "viz_chart" | "mermaid" | "text" | "kpi";
  content: unknown;
  x: number;
  y: number;
  w: number;
  h: number;
  title?: string;
}

export interface PinnedResponse {
  id: string;
  conversationId: string | null;
  messageId: string | null;
  title: string;
  description: string;
  contentJson: unknown[];
  createdAt: string;
  updatedAt: string;
}

export interface Story {
  id: string;
  title: string;
  slidesJson: StorySlide[];
  autoAdvanceInterval: number | null;
  slideCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface StorySlide {
  id?: string;
  title: string;
  content: string;
  notes?: string;
}

// ---------------------------------------------------------------
// API response wrappers
// ---------------------------------------------------------------

export interface ConversationWithMessages extends Conversation {
  messages: Message[];
}
