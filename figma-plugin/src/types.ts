// Copied from src/types/sheets.ts — Sindri Sheet data types

export interface MetaRow {
    id: string;
    Project_ID: string;
    Project_Name: string;
    Project_Vision: string;
    Owner: string;
    Stakeholders: string;
    Overall_Status: string;
    Version: string;
    Changelog: string;
}

export interface FeatureRow {
    id: string;
    Feat_ID: string;
    Step: string;
    Description: string;
    Command_Type: string;
    Command_Detail: string;
    Target_Type: string;
    Target_ID: string;
    Input_Source: string;
    Input_Payload: string;
}

export interface DesignTokenRow {
    id: string;
    Category: string;
    Token_Name: string;
    Value: string;
    Description: string;
}

export interface ScreenRow {
    id: string;
    Screen_ID: string;
    Screen_Name: string;
    Description: string;
    Figma_Frame_Name: string;
    Related_Feat_ID: string;
    Parent_Screen: string;
    Access_Level: string;
    Status: string;
}

export interface ErrorRow {
    id: string;
    Error_ID: string;
    Related_Feat_ID: string;
    Screen_ID: string;
    Error_Type: string;
    Severity: string;
    User_Message_KO: string;
    User_Message_EN: string;
    Trigger_Condition: string;
    Recovery_Action: string;
}

// Messages between UI and Plugin Sandbox
export interface GenerateScreensMessage {
    type: 'generate-screens';
    screens: ScreenRow[];
    tokens: DesignTokenRow[];
    features: FeatureRow[];
    meta: MetaRow;
    errors: ErrorRow[];
}

export interface SyncTokensMessage {
    type: 'sync-tokens';
    tokens: DesignTokenRow[];
}

export interface ProgressMessage {
    type: 'progress';
    current: number;
    total: number;
    screenName: string;
}

export interface CompleteMessage {
    type: 'complete';
    generatedCount: number;
}

export interface ErrorMessage {
    type: 'error';
    message: string;
}

// Design JSON import from web editor
export interface DesignObject {
    id: string;
    type: 'rect' | 'text' | 'ellipse' | 'group' | 'line';
    name: string;
    x: number;
    y: number;
    width: number;
    height: number;
    rotation: number;
    opacity: number;
    visible: boolean;
    fill: string;
    stroke: string;
    strokeWidth: number;
    cornerRadius?: number;
    // Text fields
    text?: string;
    fontSize?: number;
    fontFamily?: string;
    fontWeight?: 'normal' | 'bold' | 'medium';
    textAlign?: 'left' | 'center' | 'right';
    color?: string;
    // Ellipse
    rx?: number;
    ry?: number;
    // Group
    children?: DesignObject[];
    // Line
    x1?: number;
    y1?: number;
    x2?: number;
    y2?: number;
}

export interface DesignDocument {
    id: string;
    name: string;
    canvas: { width: number; height: number; backgroundColor: string };
    objects: DesignObject[];
    metadata?: {
        screenRef?: { Screen_ID: string; Screen_Name: string };
    };
}

export interface ImportDesignMessage {
    type: 'import-design';
    design: DesignDocument;
}

export interface ImportDesignCompleteMessage {
    type: 'import-design-complete';
    nodeCount: number;
}

export type PluginMessage =
    | GenerateScreensMessage
    | SyncTokensMessage
    | ImportDesignMessage
    | ProgressMessage
    | CompleteMessage
    | ErrorMessage
    | ImportDesignCompleteMessage;
