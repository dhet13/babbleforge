// ─── Design Document Schema ──────────────────────────────────────────────────

/** Root design document persisted to DB */
export interface DesignDocument {
  id: string;
  sheetId: string;
  screenId?: string;
  name: string;
  version: number;
  canvas: {
    width: number;
    height: number;
    backgroundColor: string;
  };
  objects: DesignObject[];
  metadata: {
    createdAt: string;
    updatedAt: string;
    createdBy: string;
    generatedBy?: 'ai' | 'manual';
    screenRef?: {
      Screen_ID: string;
      Screen_Name: string;
    };
  };
}

// ─── Design Objects ──────────────────────────────────────────────────────────

export type DesignObject =
  | RectObject
  | TextObject
  | EllipseObject
  | GroupObject
  | LineObject;

export interface BaseDesignObject {
  id: string;
  type: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  visible: boolean;
  locked: boolean;
  fill: string;           // hex color or 'transparent'
  stroke: string;         // hex color or 'none'
  strokeWidth: number;
  cornerRadius?: number;
  shadow?: {
    color: string;
    offsetX: number;
    offsetY: number;
    blur: number;
  };
  sindriMeta?: {
    tokenRef?: string;
    semanticRole?: string;
    featRef?: string;
  };
}

export interface RectObject extends BaseDesignObject {
  type: 'rect';
}

export interface TextObject extends BaseDesignObject {
  type: 'text';
  text: string;
  fontSize: number;
  fontFamily: string;
  fontWeight: 'normal' | 'bold' | 'medium';
  textAlign: 'left' | 'center' | 'right';
  lineHeight: number;
  color: string;
}

export interface EllipseObject extends BaseDesignObject {
  type: 'ellipse';
  rx: number;
  ry: number;
}

export interface GroupObject extends BaseDesignObject {
  type: 'group';
  children: DesignObject[];
}

export interface LineObject extends BaseDesignObject {
  type: 'line';
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

// ─── API Types ───────────────────────────────────────────────────────────────

export interface DesignListItem {
  id: string;
  sheetId: string;
  screenId?: string;
  name: string;
  version: number;
  createdAt: string;
  updatedAt: string;
}
