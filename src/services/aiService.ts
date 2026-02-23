import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI, type Content, type FunctionDeclarationsTool, type FunctionDeclarationSchema, type FunctionDeclaration } from '@google/generative-ai';
import type { TabName, SheetRow, ActionResult } from '../types/sheets';
import type { AiProvider } from '../store/chatStore';
import { useChatStore } from '../store/chatStore';
import { useSheetStore } from '../store/sheetStore';
import { TAB_CONFIGS } from '../data/tabConfigs';
import * as figmaApi from './figmaApiClient';
import { useFigmaStore } from '../store/figmaStore';

// ─── Shared: System prompt ──────────────────────────────────────────────────

function buildSystemPrompt(): string {
    const tabSchemas = TAB_CONFIGS.map(
        (t) =>
            `### ${t.emoji} ${t.label} (tab key: "${t.key}")\nColumns: ${t.columns.map((c) => c.key).join(', ')}`
    ).join('\n\n');

    return `You are an AI assistant that manages spreadsheet data for the "Blueprint AI" project (Sindri Sheet).

The spreadsheet has 7 tabs. Here are the schemas:

${tabSchemas}

You can perform these operations via function calls:
1. **add_row**: Add a new row to a tab
2. **update_row**: Update an existing row in a tab (identify by matching field values)
3. **delete_row**: Delete a row from a tab (identify by matching field values)

When the user asks to view/show data, describe the current data in your response text.
When the user asks to add/update/delete data, use the appropriate function calls.

You also have Figma integration tools:
- **get_figma_file**: Get file structure (pages, frames) — extract the file key from Figma URLs (figma.com/design/<FILE_KEY>/...)
- **get_figma_components**: List components in a Figma file
- **get_figma_styles**: Get styles (colors, text, effects)
- **get_figma_variables**: Get design variables/tokens
- **sync_figma_tokens_to_sheet**: Import Figma variables into the Design System tab
- **push_design_tokens_to_figma**: Export Design System tab tokens to Figma variables
- **post_figma_comment**: Add a comment to a Figma file

IMPORTANT RULES:
- Always respond in the same language as the user (Korean or English).
- For add_row, provide ALL column values for the tab.
- For update_row, provide the identifying field (like ID) and only the fields to update.
- For delete_row, provide enough identifying information to find the exact row.
- You can make multiple function calls in a single response.
- After performing actions, briefly summarize what you did.
- When user references a Figma URL, extract the file key from the URL format: figma.com/design/<FILE_KEY>/...`;
}

// ─── Shared: Tool JSON Schema definitions ───────────────────────────────────

const TAB_ENUM = ['meta', 'rules', 'dataModel', 'features', 'design', 'screens', 'errors'] as const;

const toolSchemas = {
    add_row: {
        description: 'Add a new row to a specific tab in the spreadsheet',
        parameters: {
            type: 'object' as const,
            properties: {
                tab: { type: 'string' as const, enum: TAB_ENUM, description: 'The tab to add the row to' },
                data: { type: 'object' as const, description: 'The row data with column keys as properties' },
            },
            required: ['tab', 'data'],
        },
    },
    update_row: {
        description: 'Update an existing row in a specific tab',
        parameters: {
            type: 'object' as const,
            properties: {
                tab: { type: 'string' as const, enum: TAB_ENUM },
                identifier: { type: 'object' as const, description: 'Key-value pairs to identify the row' },
                updates: { type: 'object' as const, description: 'Key-value pairs of fields to update' },
            },
            required: ['tab', 'identifier', 'updates'],
        },
    },
    delete_row: {
        description: 'Delete a row from a specific tab',
        parameters: {
            type: 'object' as const,
            properties: {
                tab: { type: 'string' as const, enum: TAB_ENUM },
                identifier: { type: 'object' as const, description: 'Key-value pairs to identify the row to delete' },
            },
            required: ['tab', 'identifier'],
        },
    },
    get_sheet_data: {
        description: 'Get current data from a specific tab or all tabs',
        parameters: {
            type: 'object' as const,
            properties: {
                tab: {
                    type: 'string' as const,
                    enum: [...TAB_ENUM, 'all'] as string[],
                    description: 'The tab to get data from, or "all" for all tabs',
                },
            },
            required: ['tab'],
        },
    },
    get_figma_file: {
        description: 'Get the structure and metadata of a Figma file. Extract the file key from the URL (e.g. figma.com/design/<FILE_KEY>/...).',
        parameters: {
            type: 'object' as const,
            properties: {
                file_key: { type: 'string' as const, description: 'Figma file key extracted from URL' },
            },
            required: ['file_key'],
        },
    },
    get_figma_components: {
        description: 'Get all components from a Figma file',
        parameters: {
            type: 'object' as const,
            properties: {
                file_key: { type: 'string' as const, description: 'Figma file key' },
            },
            required: ['file_key'],
        },
    },
    get_figma_styles: {
        description: 'Get all styles (colors, text, effects) from a Figma file',
        parameters: {
            type: 'object' as const,
            properties: {
                file_key: { type: 'string' as const, description: 'Figma file key' },
            },
            required: ['file_key'],
        },
    },
    get_figma_variables: {
        description: 'Get design variables (tokens) from a Figma file — colors, spacing, typography values',
        parameters: {
            type: 'object' as const,
            properties: {
                file_key: { type: 'string' as const, description: 'Figma file key' },
            },
            required: ['file_key'],
        },
    },
    sync_figma_tokens_to_sheet: {
        description: 'Import Figma design variables into the Design System tab as design tokens',
        parameters: {
            type: 'object' as const,
            properties: {
                file_key: { type: 'string' as const, description: 'Figma file key' },
            },
            required: ['file_key'],
        },
    },
    push_design_tokens_to_figma: {
        description: 'Push design tokens from the Design System tab to Figma as variables',
        parameters: {
            type: 'object' as const,
            properties: {
                file_key: { type: 'string' as const, description: 'Figma file key' },
                collection_name: { type: 'string' as const, description: 'Target variable collection name in Figma (default: "Design Tokens")' },
            },
            required: ['file_key'],
        },
    },
    post_figma_comment: {
        description: 'Add a comment to a Figma file, optionally on a specific node/frame',
        parameters: {
            type: 'object' as const,
            properties: {
                file_key: { type: 'string' as const, description: 'Figma file key' },
                message: { type: 'string' as const, description: 'Comment text' },
                node_id: { type: 'string' as const, description: 'Optional: attach comment to a specific node' },
            },
            required: ['file_key', 'message'],
        },
    },
    generate_design: {
        description: 'Generate a wireframe design on the canvas. Creates visual elements (rectangles, text, ellipses, lines, groups) positioned on a 1440×900 canvas. Use design tokens for colors/spacing. Reference screens and features from the sheet data.',
        parameters: {
            type: 'object' as const,
            properties: {
                design_name: { type: 'string' as const, description: 'Name for the design (e.g., "로그인 화면 와이어프레임")' },
                screen_id: { type: 'string' as const, description: 'Optional: Screen_ID from the screens tab to associate this design with' },
                canvas_width: { type: 'number' as const, description: 'Canvas width in pixels (default: 1440)' },
                canvas_height: { type: 'number' as const, description: 'Canvas height in pixels (default: 900)' },
                background_color: { type: 'string' as const, description: 'Canvas background hex color (default: "#1a1a1a")' },
                objects: {
                    type: 'array' as const,
                    description: 'Array of design objects to place on the canvas',
                    items: {
                        type: 'object' as const,
                        properties: {
                            type: { type: 'string' as const, enum: ['rect', 'text', 'ellipse', 'group', 'line'], description: 'Object type' },
                            name: { type: 'string' as const, description: 'Layer name (e.g., "header", "login-button")' },
                            x: { type: 'number' as const, description: 'X position from left' },
                            y: { type: 'number' as const, description: 'Y position from top' },
                            width: { type: 'number' as const, description: 'Width in pixels' },
                            height: { type: 'number' as const, description: 'Height in pixels' },
                            fill: { type: 'string' as const, description: 'Fill color hex (e.g., "#FF7A00") or "transparent"' },
                            stroke: { type: 'string' as const, description: 'Stroke color hex or "none"' },
                            strokeWidth: { type: 'number' as const, description: 'Stroke width in pixels' },
                            cornerRadius: { type: 'number' as const, description: 'Border radius' },
                            opacity: { type: 'number' as const, description: 'Opacity 0-1' },
                            text: { type: 'string' as const, description: 'Text content (for type="text")' },
                            fontSize: { type: 'number' as const, description: 'Font size (for type="text")' },
                            fontWeight: { type: 'string' as const, enum: ['normal', 'bold', 'medium'], description: 'Font weight' },
                            textAlign: { type: 'string' as const, enum: ['left', 'center', 'right'] },
                            color: { type: 'string' as const, description: 'Text color hex (for type="text")' },
                            semanticRole: { type: 'string' as const, description: 'Semantic role (e.g., "header", "cta-button", "nav", "form-input", "card")' },
                            tokenRef: { type: 'string' as const, description: 'Design token name reference (e.g., "primary", "background")' },
                            children: { type: 'array' as const, description: 'Child objects (for type="group")' },
                        },
                        required: ['type', 'name', 'x', 'y', 'width', 'height'],
                    },
                },
            },
            required: ['design_name', 'objects'],
        },
    },
    modify_design: {
        description: 'Modify existing objects in the current wireframe design. Can update properties, add new objects, or remove objects by name or semantic role.',
        parameters: {
            type: 'object' as const,
            properties: {
                operations: {
                    type: 'array' as const,
                    description: 'List of modification operations',
                    items: {
                        type: 'object' as const,
                        properties: {
                            action: { type: 'string' as const, enum: ['update', 'add', 'delete'], description: 'Operation type' },
                            target_name: { type: 'string' as const, description: 'Name or semanticRole of the object to update/delete' },
                            updates: { type: 'object' as const, description: 'Properties to update (x, y, width, height, fill, text, fontSize, etc.)' },
                            new_object: {
                                type: 'object' as const,
                                description: 'For "add" action: the new object (same schema as generate_design objects)',
                                properties: {
                                    type: { type: 'string' as const, enum: ['rect', 'text', 'ellipse', 'line'] },
                                    name: { type: 'string' as const },
                                    x: { type: 'number' as const },
                                    y: { type: 'number' as const },
                                    width: { type: 'number' as const },
                                    height: { type: 'number' as const },
                                    fill: { type: 'string' as const },
                                    text: { type: 'string' as const },
                                    fontSize: { type: 'number' as const },
                                    color: { type: 'string' as const },
                                    cornerRadius: { type: 'number' as const },
                                    semanticRole: { type: 'string' as const },
                                },
                            },
                        },
                        required: ['action'],
                    },
                },
            },
            required: ['operations'],
        },
    },
};

// ─── Shared: Function execution ─────────────────────────────────────────────

function findRow(
    tabData: SheetRow[],
    identifier: Record<string, string>
): SheetRow | undefined {
    return tabData.find((row) => {
        const r = row as unknown as Record<string, unknown>;
        return Object.entries(identifier).every(
            ([key, val]) => String(r[key] ?? '').toLowerCase() === String(val).toLowerCase()
        );
    });
}

async function executeFunction(
    name: string,
    args: Record<string, unknown>
): Promise<{ result: string; action?: ActionResult }> {
    const store = useSheetStore.getState();

    if (name === 'get_sheet_data') {
        const tab = args.tab as string;
        if (tab === 'all') {
            const all = store.getAllData();
            return { result: JSON.stringify(all, null, 2) };
        }
        const data = store.getTabData(tab as TabName);
        return { result: JSON.stringify(data, null, 2) };
    }

    if (name === 'add_row') {
        const tab = args.tab as TabName;
        const data = args.data as Record<string, string>;
        const newRow = await store.addRow(tab, data);
        const tabConfig = TAB_CONFIGS.find((t) => t.key === tab);
        return {
            result: `Successfully added row to ${tabConfig?.label}`,
            action: {
                type: 'add',
                tab,
                rowId: newRow.id,
                summary: `${tabConfig?.emoji} ${tabConfig?.label}에 행 추가됨`,
            },
        };
    }

    if (name === 'update_row') {
        const tab = args.tab as TabName;
        const identifier = args.identifier as Record<string, string>;
        const updates = args.updates as Record<string, string>;
        const tabData = store.getTabData(tab);
        const row = findRow(tabData, identifier);
        if (!row) {
            return { result: `Row not found with identifier: ${JSON.stringify(identifier)}` };
        }
        await store.updateRow(tab, row.id, updates);
        const tabConfig = TAB_CONFIGS.find((t) => t.key === tab);
        return {
            result: `Successfully updated row in ${tabConfig?.label}`,
            action: {
                type: 'update',
                tab,
                rowId: row.id,
                summary: `${tabConfig?.emoji} ${tabConfig?.label}에서 행 수정됨`,
            },
        };
    }

    if (name === 'delete_row') {
        const tab = args.tab as TabName;
        const identifier = args.identifier as Record<string, string>;
        const tabData = store.getTabData(tab);
        const row = findRow(tabData, identifier);
        if (!row) {
            return { result: `Row not found with identifier: ${JSON.stringify(identifier)}` };
        }
        await store.deleteRow(tab, row.id);
        const tabConfig = TAB_CONFIGS.find((t) => t.key === tab);
        return {
            result: `Successfully deleted row from ${tabConfig?.label}`,
            action: {
                type: 'delete',
                tab,
                rowId: row.id,
                summary: `${tabConfig?.emoji} ${tabConfig?.label}에서 행 삭제됨`,
            },
        };
    }

    // ─── Figma tools ───
    const figmaToken = useChatStore.getState().figmaAccessToken;
    const figmaFileKey = args.file_key as string | undefined;

    if (name === 'get_figma_file') {
        if (!figmaToken) return { result: 'Figma Access Token이 설정되지 않았습니다. 설정에서 입력해주세요.' };
        const file = await figmaApi.getFile(figmaToken, figmaFileKey!);
        return { result: JSON.stringify({ name: file.name, lastModified: file.lastModified, version: file.version, pages: file.document.children?.map((p) => ({ id: p.id, name: p.name, type: p.type })) }, null, 2) };
    }

    if (name === 'get_figma_components') {
        if (!figmaToken) return { result: 'Figma Access Token이 설정되지 않았습니다.' };
        const components = await figmaApi.getFileComponents(figmaToken, figmaFileKey!);
        return { result: JSON.stringify(components, null, 2) };
    }

    if (name === 'get_figma_styles') {
        if (!figmaToken) return { result: 'Figma Access Token이 설정되지 않았습니다.' };
        const styles = await figmaApi.getFileStyles(figmaToken, figmaFileKey!);
        return { result: JSON.stringify(styles, null, 2) };
    }

    if (name === 'get_figma_variables') {
        if (!figmaToken) return { result: 'Figma Access Token이 설정되지 않았습니다.' };
        const { variables, collections } = await figmaApi.getFileVariables(figmaToken, figmaFileKey!);
        return { result: JSON.stringify({ collections: collections.map((c) => ({ id: c.id, name: c.name, variableCount: c.variableIds.length })), variables: variables.map((v) => ({ id: v.id, name: v.name, type: v.resolvedType, value: figmaApi.resolveVariableValue(Object.values(v.valuesByMode)[0]), description: v.description })) }, null, 2) };
    }

    if (name === 'sync_figma_tokens_to_sheet') {
        if (!figmaToken) return { result: 'Figma Access Token이 설정되지 않았습니다.' };
        const { variables, collections } = await figmaApi.getFileVariables(figmaToken, figmaFileKey!);
        const collectionMap = Object.fromEntries(collections.map((c) => [c.id, c.name]));
        let added = 0;
        for (const v of variables) {
            const collectionId = collections.find((c) => c.variableIds.includes(v.id))?.id;
            const category = collectionId ? collectionMap[collectionId] : 'Uncategorized';
            const value = figmaApi.resolveVariableValue(Object.values(v.valuesByMode)[0]);
            await store.addRow('design', {
                Category: category,
                Token_Name: v.name,
                Value: value,
                Description: v.description || `Imported from Figma (${v.resolvedType})`,
            });
            added++;
        }
        return {
            result: `Figma에서 ${added}개의 디자인 토큰을 Design System 탭에 가져왔습니다.`,
            action: { type: 'add', tab: 'design', rowId: '', summary: `🎨 Design System에 ${added}개 토큰 추가됨` },
        };
    }

    if (name === 'push_design_tokens_to_figma') {
        if (!figmaToken) return { result: 'Figma Access Token이 설정되지 않았습니다.' };
        const designData = store.getTabData('design');
        const collectionName = (args.collection_name as string) || 'Design Tokens';
        const tokensByCategory: Record<string, Array<{ name: string; value: string; type: string }>> = {};
        for (const row of designData) {
            const r = row as unknown as Record<string, string>;
            const cat = r.Category || 'Uncategorized';
            if (!tokensByCategory[cat]) tokensByCategory[cat] = [];
            tokensByCategory[cat].push({ name: r.Token_Name, value: r.Value, type: r.Value?.startsWith('#') ? 'COLOR' : 'FLOAT' });
        }
        await figmaApi.postVariables(figmaToken, figmaFileKey!, {
            variableCollections: [{ action: 'CREATE', name: collectionName }],
        });
        return { result: `Design System 탭의 ${designData.length}개 토큰을 Figma "${collectionName}" 컬렉션으로 내보냈습니다.` };
    }

    if (name === 'post_figma_comment') {
        if (!figmaToken) return { result: 'Figma Access Token이 설정되지 않았습니다.' };
        const message = args.message as string;
        const nodeId = args.node_id as string | undefined;
        await figmaApi.postComment(figmaToken, figmaFileKey!, message, nodeId);
        return { result: `Figma에 댓글을 추가했습니다: "${message}"` };
    }

    // ─── Design editor tools ───
    if (name === 'generate_design') {
        const designName = args.design_name as string;
        const screenId = args.screen_id as string | undefined;
        const canvasWidth = (args.canvas_width as number) || 1440;
        const canvasHeight = (args.canvas_height as number) || 900;
        const bgColor = (args.background_color as string) || '#1a1a1a';
        const rawObjects = (args.objects as Array<Record<string, unknown>>) || [];

        const { useDesignStore } = await import('../store/designStore');
        const designStore = useDesignStore.getState();

        const objects = rawObjects.map((obj) => buildDesignObject(obj));

        const screenRow = screenId
            ? (store.getTabData('screens') as unknown as Array<Record<string, string>>)
                .find((s) => s.Screen_ID === screenId)
            : undefined;

        const design: import('../types/design').DesignDocument = {
            id: '',
            sheetId: '',
            screenId,
            name: designName,
            version: 1,
            canvas: { width: canvasWidth, height: canvasHeight, backgroundColor: bgColor },
            objects,
            metadata: {
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                createdBy: 'ai',
                generatedBy: 'ai',
                screenRef: screenRow ? { Screen_ID: screenRow.Screen_ID, Screen_Name: screenRow.Screen_Name } : undefined,
            },
        };

        designStore.setDesign(design);
        return { result: `디자인 "${designName}"을 생성했습니다. ${objects.length}개 요소가 캔버스에 표시됩니다.` };
    }

    if (name === 'modify_design') {
        const operations = (args.operations as Array<Record<string, unknown>>) || [];
        const { useDesignStore } = await import('../store/designStore');
        const designStore = useDesignStore.getState();
        const currentDesign = designStore.currentDesign;

        if (!currentDesign) {
            return { result: '현재 활성 디자인이 없습니다. 먼저 generate_design으로 디자인을 생성해주세요.' };
        }

        designStore.pushUndo();
        let updatedObjects = [...currentDesign.objects];
        const results: string[] = [];

        for (const op of operations) {
            const action = op.action as string;
            const targetName = op.target_name as string | undefined;

            if (action === 'update' && targetName) {
                const updates = op.updates as Record<string, unknown> | undefined;
                if (!updates) continue;

                const idx = updatedObjects.findIndex(
                    (o) => o.name === targetName || o.sindriMeta?.semanticRole === targetName
                );
                if (idx >= 0) {
                    const obj = updatedObjects[idx];
                    updatedObjects[idx] = applyDesignUpdates(obj, updates);
                    results.push(`"${targetName}" 업데이트됨`);
                } else {
                    results.push(`"${targetName}" 찾을 수 없음`);
                }
            } else if (action === 'add') {
                const newObj = op.new_object as Record<string, unknown> | undefined;
                if (newObj) {
                    updatedObjects.push(buildDesignObject(newObj));
                    results.push(`"${newObj.name || 'new-object'}" 추가됨`);
                }
            } else if (action === 'delete' && targetName) {
                const before = updatedObjects.length;
                updatedObjects = updatedObjects.filter(
                    (o) => o.name !== targetName && o.sindriMeta?.semanticRole !== targetName
                );
                if (updatedObjects.length < before) {
                    results.push(`"${targetName}" 삭제됨`);
                } else {
                    results.push(`"${targetName}" 찾을 수 없음`);
                }
            }
        }

        designStore.setObjects(updatedObjects);
        return { result: `디자인 수정 완료: ${results.join(', ')}` };
    }

    return { result: 'Unknown function' };
}

// ─── Design object helpers ──────────────────────────────────────────────────

function buildDesignObject(obj: Record<string, unknown>): import('../types/design').DesignObject {
    const base = {
        id: crypto.randomUUID(),
        name: (obj.name as string) || 'unnamed',
        x: (obj.x as number) || 0,
        y: (obj.y as number) || 0,
        width: (obj.width as number) || 100,
        height: (obj.height as number) || 50,
        rotation: 0,
        opacity: (obj.opacity as number) ?? 1,
        visible: true,
        locked: false,
        fill: (obj.fill as string) || '#333333',
        stroke: (obj.stroke as string) || 'none',
        strokeWidth: (obj.strokeWidth as number) || 0,
        cornerRadius: (obj.cornerRadius as number) || 0,
        sindriMeta: {
            semanticRole: obj.semanticRole as string | undefined,
            tokenRef: obj.tokenRef as string | undefined,
        },
    };

    const type = obj.type as string;

    if (type === 'text') {
        return {
            ...base,
            type: 'text' as const,
            text: (obj.text as string) || '',
            fontSize: (obj.fontSize as number) || 14,
            fontFamily: 'Inter',
            fontWeight: ((obj.fontWeight as string) || 'normal') as 'normal' | 'bold' | 'medium',
            textAlign: ((obj.textAlign as string) || 'left') as 'left' | 'center' | 'right',
            lineHeight: 1.2,
            color: (obj.color as string) || '#ffffff',
        };
    }

    if (type === 'ellipse') {
        return {
            ...base,
            type: 'ellipse' as const,
            rx: (obj.width as number || 100) / 2,
            ry: (obj.height as number || 50) / 2,
        };
    }

    if (type === 'line') {
        return {
            ...base,
            type: 'line' as const,
            x1: base.x,
            y1: base.y,
            x2: base.x + base.width,
            y2: base.y,
        };
    }

    if (type === 'group') {
        const children = (obj.children as Array<Record<string, unknown>> || []).map(buildDesignObject);
        return { ...base, type: 'group' as const, children };
    }

    return { ...base, type: 'rect' as const };
}

function applyDesignUpdates(
    obj: import('../types/design').DesignObject,
    updates: Record<string, unknown>,
): import('../types/design').DesignObject {
    const updated = { ...obj } as Record<string, unknown>;

    for (const [key, value] of Object.entries(updates)) {
        if (key in updated) {
            updated[key] = value;
        }
        // Handle text-specific fields
        if (key === 'text' || key === 'fontSize' || key === 'fontWeight' || key === 'textAlign' || key === 'color') {
            updated[key] = value;
        }
    }

    return updated as import('../types/design').DesignObject;
}

// ─── Shared: Data context ───────────────────────────────────────────────────

function buildDataContext(): string {
    const currentData = useSheetStore.getState().getAllData();
    return `\n\nCurrent spreadsheet data summary:\n${JSON.stringify(
        Object.fromEntries(
            Object.entries(currentData).map(([k, v]) => [k, `${(v as unknown[]).length} rows`])
        )
    )}`;
}

// ─── Design Mode: System prompt ─────────────────────────────────────────────

function buildDesignModeSystemPrompt(): string {
    const store = useSheetStore.getState();
    const screens = store.getTabData('screens');
    const designTokens = store.getTabData('design');
    const features = store.getTabData('features');
    const meta = store.getTabData('meta');

    const metaRow = meta[0] as unknown as Record<string, string> | undefined;
    const projectInfo = metaRow
        ? `Project: ${metaRow.Project_Name || 'Unknown'}\nVision: ${metaRow.Project_Vision || 'N/A'}`
        : 'No project metadata loaded.';

    const screensSummary = screens.length > 0
        ? JSON.stringify(screens.map((s) => {
            const r = s as unknown as Record<string, string>;
            return { Screen_ID: r.Screen_ID, Screen_Name: r.Screen_Name, Figma_Frame_Name: r.Figma_Frame_Name, Status: r.Status, Description: r.Description };
        }), null, 2)
        : '[]';

    const tokensSummary = designTokens.length > 0
        ? JSON.stringify(designTokens.map((t) => {
            const r = t as unknown as Record<string, string>;
            return { Category: r.Category, Token_Name: r.Token_Name, Value: r.Value };
        }), null, 2)
        : '[]';

    const featuresSummary = features.slice(0, 30).map((f) => {
        const r = f as unknown as Record<string, string>;
        return `- ${r.Feat_ID}: ${r.Description || r.Step || ''}`;
    }).join('\n');

    const tabSchemas = TAB_CONFIGS.map(
        (t) => `### ${t.emoji} ${t.label} (tab key: "${t.key}")\nColumns: ${t.columns.map((c) => c.key).join(', ')}`
    ).join('\n\n');

    return `You are an AI design assistant for "Sindri Sheet" (Blueprint AI).
You are in DESIGN MODE — the user is working on Figma designs and needs help with UI/UX decisions based on their project planning data.

## Project Context
${projectInfo}

## Screen Map (${screens.length} screens)
${screensSummary}

## Design Tokens (${designTokens.length} tokens)
${tokensSummary}

## Features Summary (${features.length} total)
${featuresSummary}

## Your Capabilities
1. **Design guidance**: Suggest layouts, component placement, spacing, visual hierarchy based on the screen map
2. **Label suggestions**: Propose button labels, heading text, placeholder text based on features
3. **Design token usage**: Recommend which design tokens to use for specific elements
4. **Screen flow**: Explain navigation between screens based on parent relationships
5. **Figma operations**: get_figma_file, get_figma_components, get_figma_styles, get_figma_variables, sync_figma_tokens_to_sheet, push_design_tokens_to_figma, post_figma_comment
6. **Sheet operations**: add_row, update_row, delete_row, get_sheet_data (update screen statuses, add tokens, etc.)

## Design Generation Capabilities
You can now CREATE wireframe designs directly on the canvas using these tools:
- **generate_design**: Create a complete wireframe from scratch. Place objects on a 1440×900 canvas using absolute x,y coordinates.
- **modify_design**: Edit the current design — update properties, add new elements, or remove elements by name or semanticRole.

When asked to create a design:
1. Check the Screen Map for the requested screen's description and features
2. Use Design Tokens for colors (reference by Token_Name, use actual hex values in fills)
3. Create a clear visual hierarchy: header bar at top, main content area, navigation, buttons, forms as needed
4. Use semanticRole to label each element (e.g., "header", "nav", "cta-button", "form-input", "card", "footer")
5. Use standard UI patterns: login forms get centered cards with inputs + button, dashboards get card grids, chat gets message bubbles + input bar

Common design token mappings:
- background → page background
- surface → cards, panels
- primary → accent/CTA elements
- border → dividers, input borders
- text → heading text color

## Other Design Instructions
- Reference screens by Screen_ID and Screen_Name
- Reference design tokens by Token_Name when suggesting colors/spacing/typography
- You CAN post comments to Figma frames as design review notes
- You CAN update screen statuses in the sheet (e.g., mark as "Design Complete")

${tabSchemas}

IMPORTANT: Always respond in the same language as the user (Korean or English). Focus on actionable design guidance.`;
}

// ─── OpenAI implementation ──────────────────────────────────────────────────

const openaiTools: OpenAI.Chat.Completions.ChatCompletionTool[] = Object.entries(toolSchemas).map(
    ([name, schema]) => ({
        type: 'function' as const,
        function: { name, description: schema.description, parameters: schema.parameters },
    })
);

async function sendWithOpenAI(
    apiKey: string,
    model: string,
    userMessage: string,
    chatHistory: { role: 'user' | 'assistant' | 'system'; content: string }[],
    systemPrompt?: string,
): Promise<{ content: string; actions: ActionResult[] }> {
    const client = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });

    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
        { role: 'system', content: systemPrompt ?? (buildSystemPrompt() + buildDataContext()) },
        ...chatHistory.filter((m) => m.role !== 'system').map((m) => ({
            role: m.role as 'user' | 'assistant',
            content: m.content,
        })),
        { role: 'user', content: userMessage },
    ];

    const actions: ActionResult[] = [];

    let response = await client.chat.completions.create({
        model,
        messages,
        tools: openaiTools,
        tool_choice: 'auto',
    });

    let assistantMessage = response.choices[0].message;

    while (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
        const toolMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];
        messages.push(assistantMessage);

        for (const toolCall of assistantMessage.tool_calls) {
            if (!('function' in toolCall)) continue;
            const fnName = toolCall.function.name;
            const fnArgs = JSON.parse(toolCall.function.arguments);
            const { result, action } = await executeFunction(fnName, fnArgs);

            if (action) actions.push(action);

            toolMessages.push({
                role: 'tool',
                tool_call_id: toolCall.id,
                content: result,
            });
        }

        messages.push(...toolMessages);

        response = await client.chat.completions.create({
            model,
            messages,
            tools: openaiTools,
            tool_choice: 'auto',
        });

        assistantMessage = response.choices[0].message;
    }

    return {
        content: assistantMessage.content || '작업이 완료되었습니다.',
        actions,
    };
}

// ─── Anthropic implementation ───────────────────────────────────────────────

const anthropicTools: Anthropic.Messages.Tool[] = Object.entries(toolSchemas).map(
    ([name, schema]) => ({
        name,
        description: schema.description,
        input_schema: schema.parameters as Anthropic.Messages.Tool['input_schema'],
    })
);

async function sendWithAnthropic(
    apiKey: string,
    model: string,
    userMessage: string,
    chatHistory: { role: 'user' | 'assistant' | 'system'; content: string }[],
    systemPrompt?: string,
): Promise<{ content: string; actions: ActionResult[] }> {
    const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });

    const messages: Anthropic.Messages.MessageParam[] = [
        ...chatHistory
            .filter((m) => m.role !== 'system')
            .map((m) => ({
                role: m.role as 'user' | 'assistant',
                content: m.content,
            })),
        { role: 'user', content: userMessage },
    ];

    const actions: ActionResult[] = [];

    let response = await client.messages.create({
        model,
        max_tokens: 4096,
        system: systemPrompt ?? (buildSystemPrompt() + buildDataContext()),
        messages,
        tools: anthropicTools,
    });

    // Process tool_use in a loop
    while (response.stop_reason === 'tool_use') {
        const toolUseBlocks = response.content.filter(
            (block): block is Anthropic.Messages.ToolUseBlock => block.type === 'tool_use'
        );

        const toolResults: Anthropic.Messages.ToolResultBlockParam[] = [];

        for (const toolUse of toolUseBlocks) {
            const { result, action } = await executeFunction(
                toolUse.name,
                toolUse.input as Record<string, unknown>
            );
            if (action) actions.push(action);

            toolResults.push({
                type: 'tool_result',
                tool_use_id: toolUse.id,
                content: result,
            });
        }

        messages.push({ role: 'assistant', content: response.content });
        messages.push({ role: 'user', content: toolResults });

        response = await client.messages.create({
            model,
            max_tokens: 4096,
            system: systemPrompt ?? (buildSystemPrompt() + buildDataContext()),
            messages,
            tools: anthropicTools,
        });
    }

    const textBlocks = response.content.filter(
        (block): block is Anthropic.Messages.TextBlock => block.type === 'text'
    );
    const content = textBlocks.map((b) => b.text).join('\n') || '작업이 완료되었습니다.';

    return { content, actions };
}

// ─── Gemini implementation ──────────────────────────────────────────────────

const geminiTools: FunctionDeclarationsTool = {
    functionDeclarations: Object.entries(toolSchemas).map(
        ([name, schema]): FunctionDeclaration => ({
            name,
            description: schema.description,
            parameters: schema.parameters as unknown as FunctionDeclarationSchema,
        })
    ),
};

async function sendWithGemini(
    apiKey: string,
    model: string,
    userMessage: string,
    chatHistory: { role: 'user' | 'assistant' | 'system'; content: string }[],
    systemPrompt?: string,
): Promise<{ content: string; actions: ActionResult[] }> {
    const client = new GoogleGenerativeAI(apiKey);
    const genModel = client.getGenerativeModel({
        model,
        systemInstruction: systemPrompt ?? (buildSystemPrompt() + buildDataContext()),
        tools: [geminiTools],
    });

    const contents: Content[] = [
        ...chatHistory
            .filter((m) => m.role !== 'system')
            .map((m): Content => ({
                role: m.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: m.content }],
            })),
        { role: 'user', parts: [{ text: userMessage }] },
    ];

    const actions: ActionResult[] = [];

    let response = await genModel.generateContent({ contents });
    let result = response.response;
    let fnCalls = result.functionCalls();

    while (fnCalls && fnCalls.length > 0) {
        // Add assistant response (with function calls) to contents
        contents.push({ role: 'model', parts: result.candidates![0].content.parts });

        // Execute each function call and collect responses
        const functionResponseParts = [];
        for (const fnCall of fnCalls) {
            const { result: fnResult, action } = await executeFunction(
                fnCall.name,
                fnCall.args as Record<string, unknown>
            );
            if (action) actions.push(action);

            functionResponseParts.push({
                functionResponse: {
                    name: fnCall.name,
                    response: { result: fnResult },
                },
            });
        }

        contents.push({ role: 'user', parts: functionResponseParts });

        response = await genModel.generateContent({ contents });
        result = response.response;
        fnCalls = result.functionCalls();
    }

    const text = result.text() || '작업이 완료되었습니다.';
    return { content: text, actions };
}

// ─── Public API ─────────────────────────────────────────────────────────────

export async function sendChatMessage(
    provider: AiProvider,
    apiKey: string,
    model: string,
    userMessage: string,
    chatHistory: { role: 'user' | 'assistant' | 'system'; content: string }[]
): Promise<{ content: string; actions: ActionResult[] }> {
    if (provider === 'anthropic') {
        return sendWithAnthropic(apiKey, model, userMessage, chatHistory);
    }
    if (provider === 'gemini') {
        return sendWithGemini(apiKey, model, userMessage, chatHistory);
    }
    return sendWithOpenAI(apiKey, model, userMessage, chatHistory);
}

export async function sendDesignChatMessage(
    provider: AiProvider,
    apiKey: string,
    model: string,
    userMessage: string,
    chatHistory: { role: 'user' | 'assistant' | 'system'; content: string }[]
): Promise<{ content: string; actions: ActionResult[] }> {
    const prompt = buildDesignModeSystemPrompt();
    if (provider === 'anthropic') {
        return sendWithAnthropic(apiKey, model, userMessage, chatHistory, prompt);
    }
    if (provider === 'gemini') {
        return sendWithGemini(apiKey, model, userMessage, chatHistory, prompt);
    }
    return sendWithOpenAI(apiKey, model, userMessage, chatHistory, prompt);
}
