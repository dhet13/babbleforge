import { create } from 'zustand';

interface FigmaState {
    figmaUrl: string;
    isEmbedVisible: boolean;
    figmaFileKey: string;

    setFigmaUrl: (url: string) => void;
    toggleEmbed: () => void;
    setEmbedVisible: (visible: boolean) => void;
}

function parseFigmaFileKey(url: string): string {
    // Figma URL formats:
    // https://www.figma.com/design/<FILE_KEY>/...
    // https://www.figma.com/file/<FILE_KEY>/...
    const match = url.match(/figma\.com\/(?:design|file)\/([a-zA-Z0-9]+)/);
    return match?.[1] ?? '';
}

function buildEmbedUrl(url: string): string {
    if (!url) return '';
    return `https://www.figma.com/embed?embed_host=sindri_sheet&url=${encodeURIComponent(url)}`;
}

export const useFigmaStore = create<FigmaState>((set) => ({
    figmaUrl: '',
    isEmbedVisible: false,
    figmaFileKey: '',

    setFigmaUrl: (url) =>
        set({
            figmaUrl: url,
            figmaFileKey: parseFigmaFileKey(url),
        }),

    toggleEmbed: () =>
        set((state) => ({ isEmbedVisible: !state.isEmbedVisible })),

    setEmbedVisible: (visible) =>
        set({ isEmbedVisible: visible }),
}));

export { buildEmbedUrl };
