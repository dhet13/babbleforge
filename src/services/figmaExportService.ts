import {
    getFile,
    getFileComponents,
    getFileStyles,
    getFileVariables,
    resolveVariableValue,
} from './figmaApiClient';

export async function exportFigmaToJSON(
    token: string,
    fileKey: string,
): Promise<void> {
    // Fire all API calls in parallel — allSettled so partial failures
    // (e.g. variables API on free-tier) don't abort the entire export
    const [fileResult, componentsResult, stylesResult, variablesResult] =
        await Promise.allSettled([
            getFile(token, fileKey),
            getFileComponents(token, fileKey),
            getFileStyles(token, fileKey),
            getFileVariables(token, fileKey),
        ]);

    // File call is mandatory (we need name + document structure)
    if (fileResult.status === 'rejected') {
        throw new Error(
            `Figma 파일 정보를 가져올 수 없습니다: ${fileResult.reason?.message || fileResult.reason}`,
        );
    }
    const fileData = fileResult.value;

    // Optional calls — use empty arrays as fallback
    const components =
        componentsResult.status === 'fulfilled' ? componentsResult.value : [];
    const styles =
        stylesResult.status === 'fulfilled' ? stylesResult.value : [];
    const variablesData =
        variablesResult.status === 'fulfilled'
            ? variablesResult.value
            : { variables: [], collections: [] };

    // Transform document tree: pages (top-level) + frames (depth=2)
    const pages = (fileData.document.children || []).map((page) => ({
        id: page.id,
        name: page.name,
        type: page.type,
        children: (page.children || []).map((frame) => ({
            id: frame.id,
            name: frame.name,
            type: frame.type,
        })),
    }));

    // Resolve variable values to readable strings
    const resolvedVariables = variablesData.variables.map((v) => {
        const resolvedValues: Record<string, string> = {};
        for (const [modeId, val] of Object.entries(v.valuesByMode)) {
            resolvedValues[modeId] = resolveVariableValue(val);
        }
        return {
            id: v.id,
            name: v.name,
            resolvedType: v.resolvedType,
            description: v.description,
            resolvedValues,
        };
    });

    // Assemble the export object
    const exportData = {
        exportedAt: new Date().toISOString(),
        figmaFileKey: fileKey,
        file: {
            name: fileData.name,
            version: fileData.version,
            lastModified: fileData.lastModified,
        },
        documentStructure: { pages },
        components,
        styles,
        variables: {
            collections: variablesData.collections,
            variables: resolvedVariables,
        },
    };

    // Download using Blob pattern (same as exportService.ts)
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safeName = fileData.name
        .replace(/[^a-zA-Z0-9가-힣_-]/g, '-')
        .replace(/-+/g, '-')
        .toLowerCase();
    a.download = `figma-${safeName}-design-data.json`;
    a.click();
    URL.revokeObjectURL(url);
}
