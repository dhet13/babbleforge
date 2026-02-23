import * as XLSX from 'xlsx';
import { useSheetStore } from '../store/sheetStore';
import { TAB_CONFIGS } from '../data/tabConfigs';
import type { TabName, SheetRow } from '../types/sheets';

export function exportToExcel() {
    const store = useSheetStore.getState();
    const wb = XLSX.utils.book_new();

    for (const tab of TAB_CONFIGS) {
        const data = store.getTabData(tab.key);
        // Remove internal 'id' field
        const cleanData = data.map((row) => {
            const { id, ...rest } = row as SheetRow & { id: string };
            void id;
            return rest;
        });

        const ws = XLSX.utils.json_to_sheet(cleanData, {
            header: tab.columns.map((c) => c.key),
        });

        // Set column widths
        ws['!cols'] = tab.columns.map((c) => ({ wch: (c.width || 120) / 7 }));

        XLSX.utils.book_append_sheet(wb, ws, `${tab.emoji} ${tab.label}`);
    }

    XLSX.writeFile(wb, 'sindri-sheet.xlsx');
}

export function exportToJSON() {
    const store = useSheetStore.getState();
    const allData: Record<string, unknown[]> = {};

    for (const tab of TAB_CONFIGS) {
        const data = store.getTabData(tab.key);
        allData[tab.key] = data.map((row) => {
            const { id, ...rest } = row as SheetRow & { id: string };
            void id;
            return rest;
        });
    }

    const blob = new Blob([JSON.stringify(allData, null, 2)], {
        type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sindri-sheet.json';
    a.click();
    URL.revokeObjectURL(url);
}

export function exportTabToExcel(tabKey: TabName) {
    const store = useSheetStore.getState();
    const tab = TAB_CONFIGS.find((t) => t.key === tabKey)!;
    const data = store.getTabData(tabKey);

    const cleanData = data.map((row) => {
        const { id, ...rest } = row as SheetRow & { id: string };
        void id;
        return rest;
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(cleanData, {
        header: tab.columns.map((c) => c.key),
    });
    ws['!cols'] = tab.columns.map((c) => ({ wch: (c.width || 120) / 7 }));
    XLSX.utils.book_append_sheet(wb, ws, tab.label);
    XLSX.writeFile(wb, `sindri-sheet-${tabKey}.xlsx`);
}
