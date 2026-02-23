import { create } from 'zustand';
import type { ChatMessage } from '../types/sheets';

export type AiProvider = 'openai' | 'anthropic' | 'gemini';

export const MODEL_OPTIONS: Record<AiProvider, { value: string; label: string }[]> = {
    openai: [
        { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
        { value: 'gpt-4o', label: 'GPT-4o' },
        { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
    ],
    anthropic: [
        { value: 'claude-sonnet-4-5-20250929', label: 'Claude Sonnet 4.5' },
        { value: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5' },
    ],
    gemini: [
        { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
        { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
        { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
    ],
};

const DEFAULT_MODELS: Record<AiProvider, string> = {
    openai: 'gpt-4o-mini',
    anthropic: 'claude-sonnet-4-5-20250929',
    gemini: 'gemini-2.0-flash',
};

interface ChatState {
    messages: ChatMessage[];
    isLoading: boolean;
    showApiKeyModal: boolean;

    provider: AiProvider;
    apiKeys: Record<AiProvider, string>;
    model: string;
    figmaAccessToken: string;

    designMessages: ChatMessage[];

    addMessage: (msg: ChatMessage) => void;
    addDesignMessage: (msg: ChatMessage) => void;
    setProvider: (provider: AiProvider) => void;
    setApiKey: (provider: AiProvider, key: string) => void;
    setModel: (model: string) => void;
    setFigmaAccessToken: (token: string) => void;
    setIsLoading: (loading: boolean) => void;
    setShowApiKeyModal: (show: boolean) => void;
    clearMessages: () => void;
    clearDesignMessages: () => void;
    getCurrentApiKey: () => string;
}

export const useChatStore = create<ChatState>((set, get) => ({
    messages: [
        {
            id: 'welcome',
            role: 'assistant',
            content:
                '안녕하세요! 저는 Sindri Sheet AI 어시스턴트입니다.\n\n' +
                '스프레드시트의 데이터를 자연어로 관리할 수 있어요. 예를 들어:\n\n' +
                '• **"메타 탭에 새 프로젝트 추가해줘"**\n' +
                '• **"전역 규칙에서 POL-001 항목 삭제해줘"**\n' +
                '• **"데이터 모델의 User 모델에 phone 필드 추가해줘"**\n' +
                '• **"현재 Screen Map 보여줘"**\n\n' +
                '먼저 우측 상단 설정 버튼에서 AI 프로바이더와 API 키를 설정해주세요.',
            actions: [],
            timestamp: Date.now(),
        },
    ],
    isLoading: false,
    showApiKeyModal: false,

    provider: 'openai',
    apiKeys: { openai: '', anthropic: '', gemini: '' },
    model: 'gpt-4o-mini',
    figmaAccessToken: '',

    designMessages: [
        {
            id: 'design-welcome',
            role: 'assistant',
            content:
                '안녕하세요! 디자인 모드에 오신 것을 환영합니다.\n\n' +
                'Sindri Sheet의 기획 데이터를 기반으로 디자인을 도와드립니다:\n\n' +
                '• **"로그인 화면 레이아웃 제안해줘"**\n' +
                '• **"이 화면에 필요한 버튼 라벨 알려줘"**\n' +
                '• **"디자인 토큰에서 적합한 색상 추천해줘"**\n' +
                '• **"Screen Map 기반으로 네비게이션 구조 설명해줘"**\n\n' +
                'Figma에 직접 디자인을 생성하려면 Claude Code + Figma MCP를 사용하세요.',
            actions: [],
            timestamp: Date.now(),
        },
    ],

    addMessage: (msg) =>
        set((state) => ({ messages: [...state.messages, msg] })),

    addDesignMessage: (msg) =>
        set((state) => ({ designMessages: [...state.designMessages, msg] })),

    setProvider: (provider) =>
        set({ provider, model: DEFAULT_MODELS[provider] }),

    setApiKey: (provider, key) =>
        set((state) => ({
            apiKeys: { ...state.apiKeys, [provider]: key },
        })),

    setModel: (model) => set({ model }),
    setFigmaAccessToken: (token) => set({ figmaAccessToken: token }),
    setIsLoading: (loading) => set({ isLoading: loading }),
    setShowApiKeyModal: (show) => set({ showApiKeyModal: show }),
    clearMessages: () =>
        set((state) => ({
            messages: state.messages.filter((m) => m.id === 'welcome'),
        })),
    clearDesignMessages: () =>
        set((state) => ({
            designMessages: state.designMessages.filter((m) => m.id === 'design-welcome'),
        })),
    getCurrentApiKey: () => {
        const { provider, apiKeys } = get();
        return apiKeys[provider];
    },
}));
