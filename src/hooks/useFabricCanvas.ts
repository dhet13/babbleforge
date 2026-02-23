import { useEffect, useRef, useCallback } from 'react';
import * as fabric from 'fabric';
import { useDesignStore } from '../store/designStore';
import { loadDesignToCanvas, canvasToDesignObjects } from '../services/designConverter';

export function useFabricCanvas(canvasRef: React.RefObject<HTMLCanvasElement | null>) {
  const fabricRef = useRef<fabric.Canvas | null>(null);
  const isUpdatingFromStore = useRef(false);
  const currentDesign = useDesignStore((s) => s.currentDesign);
  const setObjects = useDesignStore((s) => s.setObjects);
  const pushUndo = useDesignStore((s) => s.pushUndo);
  const setSelectedIds = useDesignStore((s) => s.setSelectedIds);

  // Initialize canvas
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = new fabric.Canvas(canvasRef.current, {
      width: currentDesign?.canvas.width || 1440,
      height: currentDesign?.canvas.height || 900,
      backgroundColor: currentDesign?.canvas.backgroundColor || '#1a1a1a',
      selection: true,
      preserveObjectStacking: true,
    });

    fabricRef.current = canvas;

    // Load initial design
    if (currentDesign) {
      isUpdatingFromStore.current = true;
      loadDesignToCanvas(canvas, currentDesign);
      isUpdatingFromStore.current = false;
    }

    // Object modification → update store
    const handleModified = () => {
      if (isUpdatingFromStore.current) return;
      pushUndo();
      const objects = canvasToDesignObjects(canvas);
      setObjects(objects);
    };

    // Selection change → update store
    const handleSelectionCreated = (e: { selected?: fabric.FabricObject[] }) => {
      const ids = (e.selected || [])
        .map((obj) => obj.data?.designId)
        .filter(Boolean);
      setSelectedIds(ids);
    };

    const handleSelectionCleared = () => {
      setSelectedIds([]);
    };

    canvas.on('object:modified', handleModified);
    canvas.on('selection:created', handleSelectionCreated as never);
    canvas.on('selection:updated', handleSelectionCreated as never);
    canvas.on('selection:cleared', handleSelectionCleared);

    return () => {
      canvas.off('object:modified', handleModified);
      canvas.off('selection:created', handleSelectionCreated as never);
      canvas.off('selection:updated', handleSelectionCreated as never);
      canvas.off('selection:cleared', handleSelectionCleared);
      canvas.dispose();
      fabricRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDesign?.id]);

  // Sync design changes from store (e.g., AI tool calls) to canvas
  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas || !currentDesign) return;

    // Only sync when not caused by canvas itself
    if (isUpdatingFromStore.current) return;

    isUpdatingFromStore.current = true;
    loadDesignToCanvas(canvas, currentDesign);
    isUpdatingFromStore.current = false;
  }, [currentDesign?.objects, currentDesign?.canvas]);

  // Zoom controls
  const zoomIn = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const zoom = Math.min((canvas.getZoom() || 1) * 1.2, 5);
    canvas.setZoom(zoom);
    canvas.renderAll();
  }, []);

  const zoomOut = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const zoom = Math.max((canvas.getZoom() || 1) / 1.2, 0.1);
    canvas.setZoom(zoom);
    canvas.renderAll();
  }, []);

  const zoomReset = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    canvas.setZoom(1);
    canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
    canvas.renderAll();
  }, []);

  // Add shapes
  const addRect = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const id = crypto.randomUUID();
    const rect = new fabric.Rect({
      left: 100,
      top: 100,
      width: 200,
      height: 100,
      fill: '#333333',
      stroke: '#666666',
      strokeWidth: 1,
      rx: 8,
      ry: 8,
      name: 'Rectangle',
      data: { designId: id },
    });
    pushUndo();
    canvas.add(rect);
    canvas.setActiveObject(rect);
    canvas.renderAll();
    setObjects(canvasToDesignObjects(canvas));
  }, [pushUndo, setObjects]);

  const addText = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const id = crypto.randomUUID();
    const text = new fabric.IText('텍스트를 입력하세요', {
      left: 100,
      top: 100,
      fontSize: 16,
      fontFamily: 'Inter',
      fill: '#ffffff',
      name: 'Text',
      data: { designId: id },
    });
    pushUndo();
    canvas.add(text);
    canvas.setActiveObject(text);
    canvas.renderAll();
    setObjects(canvasToDesignObjects(canvas));
  }, [pushUndo, setObjects]);

  const addEllipse = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const id = crypto.randomUUID();
    const ellipse = new fabric.Ellipse({
      left: 100,
      top: 100,
      rx: 60,
      ry: 40,
      fill: '#333333',
      stroke: '#666666',
      strokeWidth: 1,
      name: 'Ellipse',
      data: { designId: id },
    });
    pushUndo();
    canvas.add(ellipse);
    canvas.setActiveObject(ellipse);
    canvas.renderAll();
    setObjects(canvasToDesignObjects(canvas));
  }, [pushUndo, setObjects]);

  const deleteSelected = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const active = canvas.getActiveObjects();
    if (active.length === 0) return;
    pushUndo();
    active.forEach((obj) => canvas.remove(obj));
    canvas.discardActiveObject();
    canvas.renderAll();
    setObjects(canvasToDesignObjects(canvas));
    setSelectedIds([]);
  }, [pushUndo, setObjects, setSelectedIds]);

  return {
    fabricRef,
    zoomIn,
    zoomOut,
    zoomReset,
    addRect,
    addText,
    addEllipse,
    deleteSelected,
  };
}
