import type { ScreenRow, DesignTokenRow, FeatureRow } from '../types';
import { getTokenColor } from './tokenMapper';
import { addLabelBar } from './labelAnnotator';
import { buildWireframe } from './wireframeBuilder';

const FRAME_WIDTH = 1440;
const FRAME_HEIGHT = 900;
const FRAME_GAP = 80;

/** Create a single screen frame with label + wireframe content */
export async function createScreenFrame(
    screen: ScreenRow,
    tokens: DesignTokenRow[],
    features: FeatureRow[],
    index: number,
): Promise<FrameNode> {
    const frame = figma.createFrame();
    frame.name = `${screen.Figma_Frame_Name} — ${screen.Screen_ID}`;

    // Position frames in a grid (3 columns)
    const col = index % 3;
    const row = Math.floor(index / 3);
    frame.x = col * (FRAME_WIDTH + FRAME_GAP);
    frame.y = row * (FRAME_HEIGHT + FRAME_GAP);

    frame.resize(FRAME_WIDTH, FRAME_HEIGHT);
    frame.layoutMode = 'VERTICAL';
    frame.primaryAxisSizingMode = 'FIXED';
    frame.counterAxisSizingMode = 'FIXED';
    frame.primaryAxisAlignItems = 'MIN';
    frame.counterAxisAlignItems = 'MIN';
    frame.paddingTop = 0;
    frame.paddingBottom = 0;
    frame.paddingLeft = 0;
    frame.paddingRight = 0;
    frame.itemSpacing = 0;
    frame.clipsContent = true;

    // Background color from tokens
    const bgColor = getTokenColor(tokens, 'background', { r: 0.102, g: 0.102, b: 0.102 });
    frame.fills = [{ type: 'SOLID', color: bgColor }];

    // Add label bar at top
    await addLabelBar(frame, screen, tokens);

    // Build wireframe content based on screen description
    await buildWireframe(frame, screen, tokens, features);

    figma.currentPage.appendChild(frame);
    return frame;
}

/** Generate all screens and return count */
export async function generateAllScreens(
    screens: ScreenRow[],
    tokens: DesignTokenRow[],
    features: FeatureRow[],
    onProgress: (current: number, total: number, name: string) => void,
): Promise<number> {
    let count = 0;

    for (let i = 0; i < screens.length; i++) {
        const screen = screens[i];
        onProgress(i + 1, screens.length, screen.Screen_Name);

        await createScreenFrame(screen, tokens, features, i);
        count++;
    }

    // Zoom to fit all generated frames
    const nodes = figma.currentPage.children.slice(-count);
    if (nodes.length > 0) {
        figma.viewport.scrollAndZoomIntoView(nodes);
    }

    return count;
}
