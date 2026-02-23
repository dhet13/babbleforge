import { useState, useCallback } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useSheetStore } from '../store/sheetStore';
import { TAB_CONFIGS } from '../data/tabConfigs';
import type { TabName, SheetRow } from '../types/sheets';

export default function SheetViewer() {
    const { activeTab, setActiveTab, addRow, updateRow, deleteRow } =
        useSheetStore();
    const tabConfig = TAB_CONFIGS.find((t) => t.key === activeTab)!;
    const data = useSheetStore((s) => s[activeTab]) as SheetRow[];
    const [editingCell, setEditingCell] = useState<{
        rowId: string;
        colKey: string;
    } | null>(null);
    const [editValue, setEditValue] = useState('');

    const handleCellDoubleClick = useCallback(
        (rowId: string, colKey: string, currentValue: string) => {
            setEditingCell({ rowId, colKey });
            setEditValue(currentValue);
        },
        []
    );

    const handleCellBlur = useCallback(() => {
        if (editingCell) {
            updateRow(activeTab, editingCell.rowId, {
                [editingCell.colKey]: editValue,
            });
            setEditingCell(null);
        }
    }, [editingCell, editValue, activeTab, updateRow]);

    const handleCellKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            if (e.key === 'Enter') {
                handleCellBlur();
            } else if (e.key === 'Escape') {
                setEditingCell(null);
            }
        },
        [handleCellBlur]
    );

    const handleAddRow = async () => {
        const data: Record<string, string> = {};
        tabConfig.columns.forEach((col) => {
            data[col.key] = '';
        });
        await addRow(activeTab, data);
    };

    const handleDeleteRow = async (id: string) => {
        await deleteRow(activeTab, id);
    };

    return (
        <div className="sheet-viewer">
            <div className="sheet-tabs">
                {TAB_CONFIGS.map((tab) => (
                    <button
                        key={tab.key}
                        className={`sheet-tab ${activeTab === tab.key ? 'active' : ''}`}
                        onClick={() => setActiveTab(tab.key as TabName)}
                    >
                        <span className="tab-emoji">{tab.emoji}</span>
                        <span className="tab-label">{tab.label}</span>
                    </button>
                ))}
            </div>

            <div className="sheet-toolbar">
                <div className="sheet-info">
                    <span className="sheet-title">
                        {tabConfig.emoji} {tabConfig.label}
                    </span>
                    <span className="row-count">{data.length} rows</span>
                </div>
                <button className="btn-icon add" onClick={handleAddRow} title="행 추가">
                    <Plus size={16} />
                    <span>행 추가</span>
                </button>
            </div>

            <div className="sheet-table-wrapper">
                <table className="sheet-table">
                    <thead>
                        <tr>
                            <th className="row-num-col">#</th>
                            {tabConfig.columns.map((col) => (
                                <th key={col.key} style={{ minWidth: col.width }}>
                                    {col.label}
                                </th>
                            ))}
                            <th className="action-col">삭제</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={tabConfig.columns.length + 2}
                                    className="empty-state"
                                >
                                    데이터가 없습니다. AI 채팅으로 추가하거나 "행 추가" 버튼을
                                    클릭하세요.
                                </td>
                            </tr>
                        ) : (
                            data.map((row, idx) => {
                                const r = row as unknown as Record<string, string>;
                                return (
                                    <tr key={row.id}>
                                        <td className="row-num-col">{idx + 1}</td>
                                        {tabConfig.columns.map((col) => (
                                            <td
                                                key={col.key}
                                                className={
                                                    editingCell?.rowId === row.id &&
                                                        editingCell?.colKey === col.key
                                                        ? 'editing'
                                                        : ''
                                                }
                                                onDoubleClick={() =>
                                                    handleCellDoubleClick(
                                                        row.id,
                                                        col.key,
                                                        r[col.key] || ''
                                                    )
                                                }
                                            >
                                                {editingCell?.rowId === row.id &&
                                                    editingCell?.colKey === col.key ? (
                                                    <input
                                                        className="cell-input"
                                                        value={editValue}
                                                        onChange={(e) => setEditValue(e.target.value)}
                                                        onBlur={handleCellBlur}
                                                        onKeyDown={handleCellKeyDown}
                                                        autoFocus
                                                    />
                                                ) : (
                                                    <span className="cell-text">{r[col.key] || ''}</span>
                                                )}
                                            </td>
                                        ))}
                                        <td className="action-col">
                                            <button
                                                className="btn-icon delete"
                                                onClick={() => handleDeleteRow(row.id)}
                                                title="삭제"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
