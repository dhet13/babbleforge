import type { ScreenRow, DesignTokenRow } from '../types';
import { getTokenColor } from './tokenMapper';

const LABEL_FONT = { family: 'Inter', style: 'Medium' };
const LABEL_FONT_SMALL = { family: 'Inter', style: 'Regular' };

/** Add a metadata label bar at the top of a screen frame */
export async function addLabelBar(
    parent: FrameNode,
    screen: ScreenRow,
    tokens: DesignTokenRow[],
): Promise<void> {
    await figma.loadFontAsync(LABEL_FONT);
    await figma.loadFontAsync(LABEL_FONT_SMALL);

    const accentColor = getTokenColor(tokens, 'primary', { r: 1, g: 0.478, b: 0 });
    const surfaceColor = getTokenColor(tokens, 'surface', { r: 0.141, g: 0.141, b: 0.141 });
    const textColor: RGB = { r: 1, g: 1, b: 1 };
    const dimColor: RGB = { r: 0.627, g: 0.627, b: 0.627 };

    // Label container
    const labelBar = figma.createFrame();
    labelBar.name = '_label';
    labelBar.layoutMode = 'VERTICAL';
    labelBar.primaryAxisSizingMode = 'AUTO';
    labelBar.layoutAlign = 'STRETCH';
    labelBar.paddingTop = labelBar.paddingBottom = 8;
    labelBar.paddingLeft = labelBar.paddingRight = 12;
    labelBar.itemSpacing = 2;
    labelBar.fills = [{ type: 'SOLID', color: surfaceColor }];
    labelBar.strokes = [{ type: 'SOLID', color: accentColor }];
    labelBar.strokeWeight = 2;
    labelBar.strokeAlign = 'INSIDE';
    labelBar.dashPattern = [];

    // Only bottom border effect via stroke on bottom
    labelBar.strokeTopWeight = 0;
    labelBar.strokeLeftWeight = 0;
    labelBar.strokeRightWeight = 0;
    labelBar.strokeBottomWeight = 2;

    // Top line: Screen_ID · Screen_Name · Access_Level
    const topLine = figma.createText();
    topLine.fontName = LABEL_FONT;
    topLine.fontSize = 11;
    topLine.fills = [{ type: 'SOLID', color: textColor }];
    topLine.characters = `📌 ${screen.Screen_ID} · ${screen.Screen_Name} · ${screen.Access_Level}`;
    topLine.layoutAlign = 'STRETCH';
    labelBar.appendChild(topLine);

    // Bottom line: Related features + Status
    const bottomLine = figma.createText();
    bottomLine.fontName = LABEL_FONT_SMALL;
    bottomLine.fontSize = 10;
    bottomLine.fills = [{ type: 'SOLID', color: dimColor }];
    const related = screen.Related_Feat_ID || '—';
    bottomLine.characters = `Related: ${related} | Status: ${screen.Status}`;
    bottomLine.layoutAlign = 'STRETCH';
    labelBar.appendChild(bottomLine);

    // Insert at top of parent
    if (parent.children.length > 0) {
        parent.insertChild(0, labelBar);
    } else {
        parent.appendChild(labelBar);
    }

    // Store screen metadata as plugin data
    parent.setPluginData('sindriScreenId', screen.Screen_ID);
    parent.setPluginData('sindriScreenName', screen.Screen_Name);
    parent.setPluginData('sindriStatus', screen.Status);
}
