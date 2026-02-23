import {
  Square, Type, Circle, ZoomIn, ZoomOut, Maximize,
  Undo2, Redo2, Trash2, Save,
} from 'lucide-react';
import { useDesignStore } from '../../../store/designStore';

interface Props {
  onAddRect: () => void;
  onAddText: () => void;
  onAddEllipse: () => void;
  onDelete: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
  sheetId?: string;
}

export default function CanvasToolbar({
  onAddRect,
  onAddText,
  onAddEllipse,
  onDelete,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  sheetId,
}: Props) {
  const undo = useDesignStore((s) => s.undo);
  const redo = useDesignStore((s) => s.redo);
  const undoStack = useDesignStore((s) => s.undoStack);
  const redoStack = useDesignStore((s) => s.redoStack);
  const saveDesign = useDesignStore((s) => s.saveDesign);
  const isSaving = useDesignStore((s) => s.isSaving);
  const selectedIds = useDesignStore((s) => s.selectedIds);

  const handleSave = async () => {
    if (sheetId) await saveDesign(sheetId);
  };

  return (
    <div className="canvas-toolbar">
      <div className="toolbar-group">
        <button className="toolbar-btn" onClick={onAddRect} title="사각형 추가">
          <Square size={16} />
        </button>
        <button className="toolbar-btn" onClick={onAddText} title="텍스트 추가">
          <Type size={16} />
        </button>
        <button className="toolbar-btn" onClick={onAddEllipse} title="원 추가">
          <Circle size={16} />
        </button>
      </div>

      <div className="toolbar-divider" />

      <div className="toolbar-group">
        <button
          className="toolbar-btn"
          onClick={undo}
          disabled={undoStack.length === 0}
          title="실행취소 (Ctrl+Z)"
        >
          <Undo2 size={16} />
        </button>
        <button
          className="toolbar-btn"
          onClick={redo}
          disabled={redoStack.length === 0}
          title="다시실행 (Ctrl+Y)"
        >
          <Redo2 size={16} />
        </button>
      </div>

      <div className="toolbar-divider" />

      <div className="toolbar-group">
        <button
          className="toolbar-btn"
          onClick={onDelete}
          disabled={selectedIds.length === 0}
          title="삭제 (Delete)"
        >
          <Trash2 size={16} />
        </button>
      </div>

      <div className="toolbar-divider" />

      <div className="toolbar-group">
        <button className="toolbar-btn" onClick={onZoomIn} title="확대">
          <ZoomIn size={16} />
        </button>
        <button className="toolbar-btn" onClick={onZoomOut} title="축소">
          <ZoomOut size={16} />
        </button>
        <button className="toolbar-btn" onClick={onZoomReset} title="원래 크기">
          <Maximize size={16} />
        </button>
      </div>

      <div className="toolbar-spacer" />

      <button
        className="toolbar-btn save-btn"
        onClick={handleSave}
        disabled={isSaving}
        title="저장"
      >
        <Save size={16} />
        <span>{isSaving ? '저장 중...' : '저장'}</span>
      </button>
    </div>
  );
}
