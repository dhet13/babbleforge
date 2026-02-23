import type { DesignDocument, DesignObject, RectObject, TextObject, EllipseObject, GroupObject, LineObject } from '../types/design';
import * as fabric from 'fabric';

// ─── DesignDocument → Fabric.js ──────────────────────────────────────────────

/** Load a DesignDocument onto a Fabric.js canvas */
export function loadDesignToCanvas(
  canvas: fabric.Canvas,
  design: DesignDocument,
): void {
  canvas.clear();
  canvas.setDimensions({
    width: design.canvas.width,
    height: design.canvas.height,
  });
  canvas.backgroundColor = design.canvas.backgroundColor;

  for (const obj of design.objects) {
    const fabricObj = designObjectToFabric(obj);
    if (fabricObj) {
      canvas.add(fabricObj);
    }
  }

  canvas.renderAll();
}

function designObjectToFabric(obj: DesignObject): fabric.FabricObject | null {
  switch (obj.type) {
    case 'rect':
      return createFabricRect(obj);
    case 'text':
      return createFabricText(obj);
    case 'ellipse':
      return createFabricEllipse(obj);
    case 'group':
      return createFabricGroup(obj);
    case 'line':
      return createFabricLine(obj);
    default:
      return null;
  }
}

function createFabricRect(obj: RectObject): fabric.Rect {
  return new fabric.Rect({
    left: obj.x,
    top: obj.y,
    width: obj.width,
    height: obj.height,
    fill: obj.fill === 'transparent' ? 'transparent' : obj.fill,
    stroke: obj.stroke === 'none' ? undefined : obj.stroke,
    strokeWidth: obj.strokeWidth,
    angle: obj.rotation,
    opacity: obj.opacity,
    visible: obj.visible,
    selectable: !obj.locked,
    rx: obj.cornerRadius || 0,
    ry: obj.cornerRadius || 0,
    name: obj.name,
    data: { designId: obj.id, sindriMeta: obj.sindriMeta },
  });
}

function createFabricText(obj: TextObject): fabric.IText {
  return new fabric.IText(obj.text, {
    left: obj.x,
    top: obj.y,
    width: obj.width,
    fontSize: obj.fontSize,
    fontFamily: obj.fontFamily || 'Inter',
    fontWeight: obj.fontWeight === 'bold' ? 'bold' : obj.fontWeight === 'medium' ? '500' : 'normal',
    textAlign: obj.textAlign || 'left',
    lineHeight: obj.lineHeight || 1.2,
    fill: obj.color || '#ffffff',
    angle: obj.rotation,
    opacity: obj.opacity,
    visible: obj.visible,
    selectable: !obj.locked,
    name: obj.name,
    data: { designId: obj.id, sindriMeta: obj.sindriMeta },
  });
}

function createFabricEllipse(obj: EllipseObject): fabric.Ellipse {
  return new fabric.Ellipse({
    left: obj.x,
    top: obj.y,
    rx: obj.rx,
    ry: obj.ry,
    fill: obj.fill === 'transparent' ? 'transparent' : obj.fill,
    stroke: obj.stroke === 'none' ? undefined : obj.stroke,
    strokeWidth: obj.strokeWidth,
    angle: obj.rotation,
    opacity: obj.opacity,
    visible: obj.visible,
    selectable: !obj.locked,
    name: obj.name,
    data: { designId: obj.id, sindriMeta: obj.sindriMeta },
  });
}

function createFabricGroup(obj: GroupObject): fabric.Group {
  const children = obj.children
    .map(designObjectToFabric)
    .filter((c): c is fabric.FabricObject => c !== null);

  return new fabric.Group(children, {
    left: obj.x,
    top: obj.y,
    angle: obj.rotation,
    opacity: obj.opacity,
    visible: obj.visible,
    selectable: !obj.locked,
    name: obj.name,
    data: { designId: obj.id, sindriMeta: obj.sindriMeta },
  });
}

function createFabricLine(obj: LineObject): fabric.Line {
  return new fabric.Line([obj.x1, obj.y1, obj.x2, obj.y2], {
    left: obj.x,
    top: obj.y,
    stroke: obj.stroke === 'none' ? '#ffffff' : obj.stroke,
    strokeWidth: obj.strokeWidth,
    angle: obj.rotation,
    opacity: obj.opacity,
    visible: obj.visible,
    selectable: !obj.locked,
    name: obj.name,
    data: { designId: obj.id, sindriMeta: obj.sindriMeta },
  });
}

// ─── Fabric.js → DesignDocument ──────────────────────────────────────────────

/** Extract DesignObject array from a Fabric.js canvas */
export function canvasToDesignObjects(canvas: fabric.Canvas): DesignObject[] {
  const objects: DesignObject[] = [];

  for (const fabricObj of canvas.getObjects()) {
    const obj = fabricToDesignObject(fabricObj);
    if (obj) objects.push(obj);
  }

  return objects;
}

function fabricToDesignObject(fabricObj: fabric.FabricObject): DesignObject | null {
  const base = {
    id: fabricObj.data?.designId || crypto.randomUUID(),
    name: fabricObj.name || 'unnamed',
    x: fabricObj.left || 0,
    y: fabricObj.top || 0,
    width: (fabricObj.width || 0) * (fabricObj.scaleX || 1),
    height: (fabricObj.height || 0) * (fabricObj.scaleY || 1),
    rotation: fabricObj.angle || 0,
    opacity: fabricObj.opacity ?? 1,
    visible: fabricObj.visible !== false,
    locked: !fabricObj.selectable,
    fill: (typeof fabricObj.fill === 'string' ? fabricObj.fill : 'transparent') || 'transparent',
    stroke: fabricObj.stroke || 'none',
    strokeWidth: fabricObj.strokeWidth || 0,
    sindriMeta: fabricObj.data?.sindriMeta,
  };

  if (fabricObj instanceof fabric.Rect) {
    return {
      ...base,
      type: 'rect' as const,
      cornerRadius: fabricObj.rx || 0,
    };
  }

  if (fabricObj instanceof fabric.IText || fabricObj instanceof fabric.Textbox) {
    return {
      ...base,
      type: 'text' as const,
      text: fabricObj.text || '',
      fontSize: fabricObj.fontSize || 14,
      fontFamily: fabricObj.fontFamily || 'Inter',
      fontWeight: fabricObj.fontWeight === 'bold' ? 'bold' : fabricObj.fontWeight === '500' ? 'medium' : 'normal',
      textAlign: (fabricObj.textAlign || 'left') as 'left' | 'center' | 'right',
      lineHeight: fabricObj.lineHeight || 1.2,
      color: (typeof fabricObj.fill === 'string' ? fabricObj.fill : '#ffffff'),
    };
  }

  if (fabricObj instanceof fabric.Ellipse) {
    return {
      ...base,
      type: 'ellipse' as const,
      rx: fabricObj.rx || 0,
      ry: fabricObj.ry || 0,
    };
  }

  if (fabricObj instanceof fabric.Group) {
    const children = fabricObj.getObjects()
      .map(fabricToDesignObject)
      .filter((c): c is DesignObject => c !== null);
    return {
      ...base,
      type: 'group' as const,
      children,
    };
  }

  if (fabricObj instanceof fabric.Line) {
    return {
      ...base,
      type: 'line' as const,
      x1: fabricObj.x1 || 0,
      y1: fabricObj.y1 || 0,
      x2: fabricObj.x2 || 0,
      y2: fabricObj.y2 || 0,
    };
  }

  // Fallback: treat as rect
  return { ...base, type: 'rect' as const };
}
