import OpenAI from 'openai';
import type { TabName, SheetRow, ActionResult } from '../types/sheets';
import { useSheetStore } from '../store/sheetStore';
import { TAB_CONFIGS } from '../data/tabConfigs';

// Build the system prompt with current sheet schemas
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

IMPORTANT RULES:
- Always respond in the same language as the user (Korean or English).
- For add_row, provide ALL column values for the tab.
- For update_row, provide the identifying field (like ID) and only the fields to update.
- For delete_row, provide enough identifying information to find the exact row.
- You can make multiple function calls in a single response.
- After performing actions, briefly summarize what you did.`;
}

const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
    {
        type: 'function',
        function: {
            name: 'add_row',
            description: 'Add a new row to a specific tab in the spreadsheet',
            parameters: {
                type: 'object',
                properties: {
                    tab: {
                        type: 'string',
                        enum: ['meta', 'rules', 'dataModel', 'features', 'design', 'screens', 'errors'],
                        description: 'The tab to add the row to',
                    },
                    data: {
                        type: 'object',
                        description: 'The row data with column keys as properties',
                    },
                },
                required: ['tab', 'data'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'update_row',
            description: 'Update an existing row in a specific tab',
            parameters: {
                type: 'object',
                properties: {
                    tab: {
                        type: 'string',
                        enum: ['meta', 'rules', 'dataModel', 'features', 'design', 'screens', 'errors'],
                    },
                    identifier: {
                        type: 'object',
                        description: 'Key-value pairs to identify the row (e.g., {"Rule_ID": "POL-001"})',
                    },
                    updates: {
                        type: 'object',
                        description: 'Key-value pairs of fields to update',
                    },
                },
                required: ['tab', 'identifier', 'updates'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'delete_row',
            description: 'Delete a row from a specific tab',
            parameters: {
                type: 'object',
                properties: {
                    tab: {
                        type: 'string',
                        enum: ['meta', 'rules', 'dataModel', 'features', 'design', 'screens', 'errors'],
                    },
                    identifier: {
                        type: 'object',
                        description: 'Key-value pairs to identify the row to delete',
                    },
                },
                required: ['tab', 'identifier'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'get_sheet_data',
            description: 'Get current data from a specific tab or all tabs',
            parameters: {
                type: 'object',
                properties: {
                    tab: {
                        type: 'string',
                        enum: ['meta', 'rules', 'dataModel', 'features', 'design', 'screens', 'errors', 'all'],
                        description: 'The tab to get data from, or "all" for all tabs',
                    },
                },
                required: ['tab'],
            },
        },
    },
];

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

    return { result: 'Unknown function' };
}

export async function sendChatMessage(
    apiKey: string,
    userMessage: string,
    chatHistory: { role: 'user' | 'assistant' | 'system'; content: string }[]
): Promise<{ content: string; actions: ActionResult[] }> {
    const client = new OpenAI({
        apiKey,
        dangerouslyAllowBrowser: true,
    });

    // Build messages with sheet context
    const currentData = useSheetStore.getState().getAllData();
    const dataContext = `\n\nCurrent spreadsheet data summary:\n${JSON.stringify(
        Object.fromEntries(
            Object.entries(currentData).map(([k, v]) => [k, `${(v as unknown[]).length} rows`])
        )
    )}`;

    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
        { role: 'system', content: buildSystemPrompt() + dataContext },
        ...chatHistory.filter((m) => m.role !== 'system').map((m) => ({
            role: m.role as 'user' | 'assistant',
            content: m.content,
        })),
        { role: 'user', content: userMessage },
    ];

    const actions: ActionResult[] = [];

    // First call
    let response = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages,
        tools,
        tool_choice: 'auto',
    });

    let assistantMessage = response.choices[0].message;

    // Process tool calls in a loop
    while (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
        const toolMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];

        // Add assistant message with tool calls
        messages.push(assistantMessage);

        for (const toolCall of assistantMessage.tool_calls) {
            if (!('function' in toolCall)) continue;
            const fnName = toolCall.function.name;
            const fnArgs = JSON.parse(toolCall.function.arguments);
            const { result, action } = await executeFunction(fnName, fnArgs);

            if (action) {
                actions.push(action);
            }

            toolMessages.push({
                role: 'tool',
                tool_call_id: toolCall.id,
                content: result,
            });
        }

        messages.push(...toolMessages);

        // Continue the conversation
        response = await client.chat.completions.create({
            model: 'gpt-4o-mini',
            messages,
            tools,
            tool_choice: 'auto',
        });

        assistantMessage = response.choices[0].message;
    }

    return {
        content: assistantMessage.content || '작업이 완료되었습니다.',
        actions,
    };
}
