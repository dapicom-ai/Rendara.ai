import { create } from "zustand";

interface NavigationState {
  activeRoute: string;
  sidebarCollapsed: boolean;
  currentConversationId: string | null;
  lastMessageId: string | null;
  conversationListVersion: number;
  setActiveRoute: (route: string) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setCurrentConversation: (convId: string, msgId: string) => void;
  refreshConversationList: () => void;
}

export const useNavigationStore = create<NavigationState>((set) => ({
  activeRoute: "/",
  sidebarCollapsed: true,
  currentConversationId: null,
  lastMessageId: null,
  conversationListVersion: 0,
  setActiveRoute: (route: string) => set({ activeRoute: route }),
  setSidebarCollapsed: (collapsed: boolean) => set({ sidebarCollapsed: collapsed }),
  setCurrentConversation: (convId: string, msgId: string) =>
    set({ currentConversationId: convId, lastMessageId: msgId }),
  refreshConversationList: () => set((s) => ({ conversationListVersion: s.conversationListVersion + 1 })),
}));
