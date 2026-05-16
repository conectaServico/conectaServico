import { create } from 'zustand';
import { Chat, Message } from '@/types';

interface ChatState {
  chats: Chat[];
  messages: Message[];
  activeChat: Chat | null;
  setChats: (chats: Chat[]) => void;
  setMessages: (messages: Message[]) => void;
  setActiveChat: (chat: Chat | null) => void;
  addMessage: (message: Message) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  chats: [],
  messages: [],
  activeChat: null,
  setChats: (chats) => set({ chats }),
  setMessages: (messages) => set({ messages }),
  setActiveChat: (chat) => set({ activeChat: chat }),
  addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
}));
