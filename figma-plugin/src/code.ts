import type { PluginMessage } from './types';
import { generateAllScreens } from './generators/frameGenerator';
import { syncTokensToVariables } from './generators/tokenMapper';
import { importDesignToFigma } from './generators/designJsonImporter';

// Show the UI panel
figma.showUI(__html__, { width: 360, height: 540, themeColors: true });

// Handle messages from UI
figma.ui.onmessage = async (msg: PluginMessage) => {
    try {
        if (msg.type === 'generate-screens') {
            const count = await generateAllScreens(
                msg.screens,
                msg.tokens,
                msg.features,
                (current, total, screenName) => {
                    figma.ui.postMessage({
                        type: 'progress',
                        current,
                        total,
                        screenName,
                    } satisfies PluginMessage);
                },
            );

            figma.ui.postMessage({
                type: 'complete',
                generatedCount: count,
            } satisfies PluginMessage);

            figma.notify(`${count}개 스크린이 생성되었습니다!`);
        }

        if (msg.type === 'import-design') {
            const count = await importDesignToFigma(msg.design);

            figma.ui.postMessage({
                type: 'import-design-complete',
                nodeCount: count,
            } satisfies PluginMessage);

            figma.notify(`디자인 "${msg.design.name}" 가져오기 완료! (${count}개 요소)`);
        }

        if (msg.type === 'sync-tokens') {
            await syncTokensToVariables(msg.tokens);

            figma.ui.postMessage({
                type: 'complete',
                generatedCount: 0,
            } satisfies PluginMessage);

            figma.notify(`${msg.tokens.length}개 토큰이 동기화되었습니다!`);
        }
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        figma.ui.postMessage({
            type: 'error',
            message,
        } satisfies PluginMessage);
        figma.notify(`오류: ${message}`, { error: true });
    }
};
