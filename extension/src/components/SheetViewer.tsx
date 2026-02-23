import { useState, useCallback } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useSheetStore } from '../store/sheetStore.ts';
import { TAB_CONFIGS } from '@shared/data/tabConfigs.js';
import type { TabName, SheetRow } from '@shared/types/sheets.js';

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
    [],
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
    [handleCellBlur],
  );

  const handleAddRow = async () => {
    const rowData: Record<string, string> = {};
    tabConfig.columns.forEach((col) => {
      rowData[col.key] = '';
    });
    await addRow(activeTab, rowData);
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
            title={tab.label}
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
          <Plus size={14} />
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
              <th className="action-col"></th>
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td
                  colSpan={tabConfig.columns.length + 2}
                  className="empty-state"
                >
                  데이터가 없습니다.
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
                            r[col.key] || '',
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
                          <span className="cell-text">
                            {r[col.key] || ''}
                          </span>
                        )}
                      </td>
                    ))}
                    <td className="action-col">
                      <button
                        className="btn-icon delete"
                        onClick={() => handleDeleteRow(row.id)}
                        title="삭제"
                      >
                        <Trash2 size={12} />
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
