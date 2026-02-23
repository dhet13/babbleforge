import { useRef, useEffect } from 'react';
import { useDesignStore } from '../../../store/designStore';
import { useFabricCanvas } from '../../../hooks/useFabricCanvas';
import CanvasToolbar from './CanvasToolbar';

interface Props {
  sheetId?: string;
}

export default function WireframeCanvas({ sheetId }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const currentDesign = useDesignStore((s) => s.currentDesign);
  const undo = useDesignStore((s) => s.undo);
  const redo = useDesignStore((s) => s.redo);

  const {
    zoomIn,
    zoomOut,
    zoomReset,
    addRect,
    addText,
    addEllipse,
    deleteSelected,
  } = useFabricCanvas(canvasRef);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept when typing in input/textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === 'Delete' || e.key === 'Backspace') {
        deleteSelected();
      }
      if (e.key === 'z' && (e.ctrlKey || e.metaKey) && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      if ((e.key === 'y' && (e.ctrlKey || e.metaKey)) || (e.key === 'z' && (e.ctrlKey || e.metaKey) && e.shiftKey)) {
        e.preventDefault();
        redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [deleteSelected, undo, redo]);

  if (!currentDesign) {
    return (
      <div className="wireframe-canvas-empty">
        <div className="empty-state">
          <h3>디자인이 없습니다</h3>
          <p>AI 채팅에서 "디자인 생성해줘"라고 말하거나, 도구 바에서 직접 요소를 추가하세요.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="wireframe-canvas-container">
      <CanvasToolbar
        onAddRect={addRect}
        onAddText={addText}
        onAddEllipse={addEllipse}
        onDelete={deleteSelected}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onZoomReset={zoomReset}
        sheetId={sheetId}
      />
      <div className="wireframe-canvas-scroll" ref={containerRef}>
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}
