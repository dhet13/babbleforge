const FIGMA_API_BASE = 'https://api.figma.com/v1';

interface FigmaNode {
    id: string;
    name: string;
    type: string;
    children?: FigmaNode[];
}

interface FigmaFileResponse {
    name: string;
    lastModified: string;
    version: string;
    document: FigmaNode;
}

interface FigmaComponent {
    key: string;
    name: string;
    description: string;
    node_id: string;
    containing_frame?: { name: string };
}

interface FigmaStyle {
    key: string;
    name: string;
    style_type: string;
    description: string;
    node_id: string;
}

interface FigmaVariable {
    id: string;
    name: string;
    resolvedType: string;
    valuesByMode: Record<string, unknown>;
    description: string;
}

interface FigmaVariableCollection {
    id: string;
    name: string;
    variableIds: string[];
}

interface FigmaVariablesResponse {
    meta: {
        variables: Record<string, FigmaVariable>;
        variableCollections: Record<string, FigmaVariableCollection>;
    };
}

export interface FigmaComponentsResponse {
    meta: {
        components: FigmaComponent[];
    };
}

export interface FigmaStylesResponse {
    meta: {
        styles: FigmaStyle[];
    };
}

async function figmaFetch<T>(
    path: string,
    token: string,
    options?: RequestInit,
): Promise<T> {
    const res = await fetch(`${FIGMA_API_BASE}${path}`, {
        ...options,
        headers: {
            'X-Figma-Token': token,
            'Content-Type': 'application/json',
            ...options?.headers,
        },
    });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Figma API ${res.status}: ${text}`);
    }
    return res.json();
}

/** Get file structure and metadata */
export async function getFile(token: string, fileKey: string): Promise<FigmaFileResponse> {
    return figmaFetch(`/files/${fileKey}?depth=2`, token);
}

/** Get components from a file */
export async function getFileComponents(token: string, fileKey: string): Promise<FigmaComponent[]> {
    const res = await figmaFetch<FigmaComponentsResponse>(`/files/${fileKey}/components`, token);
    return res.meta.components;
}

/** Get styles (colors, text, effects) from a file */
export async function getFileStyles(token: string, fileKey: string): Promise<FigmaStyle[]> {
    const res = await figmaFetch<FigmaStylesResponse>(`/files/${fileKey}/styles`, token);
    return res.meta.styles;
}

/** Get design variables (tokens) from a file */
export async function getFileVariables(
    token: string,
    fileKey: string,
): Promise<{ variables: FigmaVariable[]; collections: FigmaVariableCollection[] }> {
    const res = await figmaFetch<FigmaVariablesResponse>(`/files/${fileKey}/variables/local`, token);
    return {
        variables: Object.values(res.meta.variables),
        collections: Object.values(res.meta.variableCollections),
    };
}

/** Post a comment to a file */
export async function postComment(
    token: string,
    fileKey: string,
    message: string,
    nodeId?: string,
): Promise<{ id: string }> {
    const body: Record<string, unknown> = { message };
    if (nodeId) {
        body.client_meta = { node_id: nodeId };
    }
    return figmaFetch(`/files/${fileKey}/comments`, token, {
        method: 'POST',
        body: JSON.stringify(body),
    });
}

/** Create or update variables in a file */
export async function postVariables(
    token: string,
    fileKey: string,
    payload: {
        variableCollections?: Array<{ action: string; name: string; id?: string }>;
        variables?: Array<{
            action: string;
            name: string;
            id?: string;
            variableCollectionId: string;
            resolvedType: string;
            valuesByMode: Record<string, unknown>;
        }>;
    },
): Promise<unknown> {
    return figmaFetch(`/files/${fileKey}/variables`, token, {
        method: 'POST',
        body: JSON.stringify(payload),
    });
}

/** Resolve variable value to a readable string */
export function resolveVariableValue(value: unknown): string {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        return String(value);
    }
    // RGBA color object
    if (typeof value === 'object' && value !== null && 'r' in value) {
        const c = value as { r: number; g: number; b: number; a: number };
        const toHex = (n: number) => Math.round(n * 255).toString(16).padStart(2, '0');
        return `#${toHex(c.r)}${toHex(c.g)}${toHex(c.b)}${c.a < 1 ? toHex(c.a) : ''}`;
    }
    return JSON.stringify(value);
}
