import { create } from "zustand";

export interface ContentBlock {
  type: "viz_chart" | "mermaid" | "message";
  data: Record<string, unknown>;
}

interface PinModalState {
  isOpen: boolean;
  block: ContentBlock | null;
  title: string;
  description: string;
  openModal: (block: ContentBlock, defaultTitle?: string, defaultDescription?: string) => void;
  closeModal: () => void;
  setTitle: (title: string) => void;
  setDescription: (description: string) => void;
}

export const usePinModalStore = create<PinModalState>((set) => ({
  isOpen: false,
  block: null,
  title: "",
  description: "",
  openModal: (block: ContentBlock, defaultTitle = "Untitled", defaultDescription = "") =>
    set({ isOpen: true, block, title: defaultTitle, description: defaultDescription }),
  closeModal: () => set({ isOpen: false, block: null, title: "", description: "" }),
  setTitle: (title: string) => set({ title }),
  setDescription: (description: string) => set({ description }),
}));
