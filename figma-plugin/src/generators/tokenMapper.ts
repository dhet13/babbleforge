import type { DesignTokenRow } from '../types';

/** Parse hex color string to Figma RGB (0-1 range) */
export function hexToRgb(hex: string): RGB {
    const h = hex.replace('#', '');
    const bigint = parseInt(h.length === 3
        ? h.split('').map(c => c + c).join('')
        : h, 16);
    return {
        r: ((bigint >> 16) & 255) / 255,
        g: ((bigint >> 8) & 255) / 255,
        b: (bigint & 255) / 255,
    };
}

/** Parse px value string to number */
export function parsePx(value: string): number {
    const match = value.match(/^(\d+(?:\.\d+)?)/);
    return match ? parseFloat(match[1]) : 0;
}

/** Sync all design tokens to Figma Variables */
export async function syncTokensToVariables(tokens: DesignTokenRow[]): Promise<void> {
    // Find or create the Sindri Tokens collection
    let collection = figma.variables.getLocalVariableCollections()
        .find(c => c.name === 'Sindri Tokens');

    if (!collection) {
        collection = figma.variables.createVariableCollection('Sindri Tokens');
    }

    const modeId = collection.modes[0].modeId;

    // Get existing variables to avoid duplicates
    const existingVars = new Map<string, Variable>();
    for (const varId of collection.variableIds) {
        const v = figma.variables.getVariableById(varId);
        if (v) existingVars.set(v.name, v);
    }

    for (const token of tokens) {
        const varName = `${token.Category}/${token.Token_Name}`;

        if (token.Category === 'Color' && token.Value.startsWith('#')) {
            const existing = existingVars.get(varName);
            if (existing) {
                existing.setValueForMode(modeId, hexToRgb(token.Value));
            } else {
                const variable = figma.variables.createVariable(varName, collection, 'COLOR');
                variable.setValueForMode(modeId, hexToRgb(token.Value));
                variable.description = token.Description;
            }
        } else if (token.Category === 'Spacing' || token.Category === 'Border') {
            const numVal = parsePx(token.Value);
            if (numVal > 0) {
                const existing = existingVars.get(varName);
                if (existing) {
                    existing.setValueForMode(modeId, numVal);
                } else {
                    const variable = figma.variables.createVariable(varName, collection, 'FLOAT');
                    variable.setValueForMode(modeId, numVal);
                    variable.description = token.Description;
                }
            }
        }
        // Typography and Component tokens are stored as descriptions only
        // (Figma variables don't support complex string values well)
    }
}

/** Get a color token value as RGB, with fallback */
export function getTokenColor(tokens: DesignTokenRow[], tokenName: string, fallback: RGB): RGB {
    const token = tokens.find(t => t.Category === 'Color' && t.Token_Name === tokenName);
    if (token && token.Value.startsWith('#')) return hexToRgb(token.Value);
    return fallback;
}

/** Get a spacing token value as number, with fallback */
export function getTokenSpacing(tokens: DesignTokenRow[], tokenName: string, fallback: number): number {
    const token = tokens.find(t =>
        (t.Category === 'Spacing' || t.Category === 'Border') && t.Token_Name === tokenName
    );
    if (token) {
        const val = parsePx(token.Value);
        if (val > 0) return val;
    }
    return fallback;
}
