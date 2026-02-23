import type { DesignDocument, DesignObject } from '../types';
import { hexToRgb } from './tokenMapper';

const FONT_REGULAR = { family: 'Inter', style: 'Regular' };
const FONT_MEDIUM = { family: 'Inter', style: 'Medium' };
const FONT_BOLD = { family: 'Inter', style: 'Bold' };

/** Import a DesignDocument from the web editor into Figma */
export async function importDesignToFigma(design: DesignDocument): Promise<number> {
    await figma.loadFontAsync(FONT_REGULAR);
    await figma.loadFontAsync(FONT_MEDIUM);
    await figma.loadFontAsync(FONT_BOLD);

    const frame = figma.createFrame();
    frame.name = design.name;
    frame.resize(design.canvas.width, design.canvas.height);

    if (design.canvas.backgroundColor) {
        frame.fills = [{ type: 'SOLID', color: hexToRgb(design.canvas.backgroundColor) }];
    }

    // Store metadata
    frame.setPluginData('sindriDesignId', design.id || '');
    if (design.metadata?.screenRef) {
        frame.setPluginData('sindriScreenId', design.metadata.screenRef.Screen_ID);
        frame.setPluginData('sindriScreenName', design.metadata.screenRef.Screen_Name);
    }

    let count = 0;
    for (const obj of design.objects) {
        if (!obj.visible) continue;
        const node = await createNode(obj);
        if (node) {
            frame.appendChild(node);
            count++;
        }
    }

    figma.currentPage.appendChild(frame);
    figma.viewport.scrollAndZoomIntoView([frame]);
    return count;
}

async function createNode(obj: DesignObject): Promise<SceneNode | null> {
    switch (obj.type) {
        case 'rect':
            return createRect(obj);
        case 'text':
            return createText(obj);
        case 'ellipse':
            return createEllipse(obj);
        case 'group':
            return await createGroup(obj);
        case 'line':
            return createLine(obj);
        default:
            return null;
    }
}

function createRect(obj: DesignObject): RectangleNode {
    const rect = figma.createRectangle();
    rect.name = obj.name;
    rect.x = obj.x;
    rect.y = obj.y;
    rect.resize(Math.max(obj.width, 1), Math.max(obj.height, 1));
    rect.opacity = obj.opacity;

    if (obj.fill && obj.fill !== 'transparent') {
        rect.fills = [{ type: 'SOLID', color: hexToRgb(obj.fill) }];
    } else {
        rect.fills = [];
    }

    if (obj.stroke && obj.stroke !== 'none') {
        rect.strokes = [{ type: 'SOLID', color: hexToRgb(obj.stroke) }];
        rect.strokeWeight = obj.strokeWidth || 1;
    }

    if (obj.cornerRadius) {
        rect.cornerRadius = obj.cornerRadius;
    }

    if (obj.rotation) {
        rect.rotation = obj.rotation;
    }

    return rect;
}

function createText(obj: DesignObject): TextNode {
    const text = figma.createText();
    text.name = obj.name;
    text.x = obj.x;
    text.y = obj.y;

    const weight = obj.fontWeight || 'normal';
    if (weight === 'bold') {
        text.fontName = FONT_BOLD;
    } else if (weight === 'medium') {
        text.fontName = FONT_MEDIUM;
    } else {
        text.fontName = FONT_REGULAR;
    }

    text.fontSize = obj.fontSize || 14;
    text.characters = obj.text || '';
    text.opacity = obj.opacity;

    const textColor = obj.color || '#ffffff';
    text.fills = [{ type: 'SOLID', color: hexToRgb(textColor) }];

    if (obj.textAlign) {
        text.textAlignHorizontal = obj.textAlign === 'center' ? 'CENTER' : obj.textAlign === 'right' ? 'RIGHT' : 'LEFT';
    }

    if (obj.rotation) {
        text.rotation = obj.rotation;
    }

    return text;
}

function createEllipse(obj: DesignObject): EllipseNode {
    const ellipse = figma.createEllipse();
    ellipse.name = obj.name;
    ellipse.x = obj.x;
    ellipse.y = obj.y;
    ellipse.resize(Math.max(obj.width, 1), Math.max(obj.height, 1));
    ellipse.opacity = obj.opacity;

    if (obj.fill && obj.fill !== 'transparent') {
        ellipse.fills = [{ type: 'SOLID', color: hexToRgb(obj.fill) }];
    } else {
        ellipse.fills = [];
    }

    if (obj.stroke && obj.stroke !== 'none') {
        ellipse.strokes = [{ type: 'SOLID', color: hexToRgb(obj.stroke) }];
        ellipse.strokeWeight = obj.strokeWidth || 1;
    }

    return ellipse;
}

async function createGroup(obj: DesignObject): Promise<FrameNode> {
    const group = figma.createFrame();
    group.name = obj.name;
    group.x = obj.x;
    group.y = obj.y;
    group.resize(Math.max(obj.width, 1), Math.max(obj.height, 1));
    group.opacity = obj.opacity;
    group.fills = [];

    if (obj.children) {
        for (const child of obj.children) {
            const childNode = await createNode(child);
            if (childNode) {
                group.appendChild(childNode);
            }
        }
    }

    return group;
}

function createLine(obj: DesignObject): LineNode {
    const line = figma.createLine();
    line.name = obj.name;
    line.x = obj.x;
    line.y = obj.y;

    const length = Math.max(obj.width, 1);
    line.resize(length, 0);
    line.opacity = obj.opacity;

    if (obj.stroke && obj.stroke !== 'none') {
        line.strokes = [{ type: 'SOLID', color: hexToRgb(obj.stroke) }];
    } else {
        line.strokes = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
    }
    line.strokeWeight = obj.strokeWidth || 1;

    return line;
}
