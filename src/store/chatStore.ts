import { create } from 'zustand';
import type { ChatMessage } from '../types/sheets';

interface ChatState {
    messages: ChatMessage[];
    apiKey: string;
    isLoading: boolean;
    showApiKeyModal: boolean;

    addMessage: (msg: ChatMessage) => void;
    setApiKey: (key: string) => void;
    setIsLoading: (loading: boolean) => void;
    setShowApiKeyModal: (show: boolean) => void;
    clearMessages: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
    messages: [
        {
            id: 'welcome',
            role: 'assistant',
            content:
                '안녕하세요! 👋 저는 Sindri Sheet AI 어시스턴트입니다.\n\n' +
                '스프레드시트의 데이터를 자연어로 관리할 수 있어요. 예를 들어:\n\n' +
                '• **"메타 탭에 새 프로젝트 추가해줘"**\n' +
                '• **"전역 규칙에서 POL-001 항목 삭제해줘"**\n' +
                '• **"데이터 모델의 User 모델에 phone 필드 추가해줘"**\n' +
                '• **"현재 Screen Map 보여줘"**\n\n' +
                '먼저 좌측 상단 ⚙️ 버튼에서 OpenAI API 키를 설정해주세요.',
            actions: [],
            timestamp: Date.now(),
        },
    ],
    apiKey: '',
    isLoading: false,
    showApiKeyModal: false,

    addMessage: (msg) =>
        set((state) => ({ messages: [...state.messages, msg] })),

    setApiKey: (key) => set({ apiKey: key }),
    setIsLoading: (loading) => set({ isLoading: loading }),
    setShowApiKeyModal: (show) => set({ showApiKeyModal: show }),
    clearMessages: () =>
        set((state) => ({
            messages: state.messages.filter((m) => m.id === 'welcome'),
        })),
}));
