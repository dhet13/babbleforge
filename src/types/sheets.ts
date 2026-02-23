// ===== 메타 & 커뮤니케이션 =====
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

// ===== 전역 규칙 & 정책 =====
export interface GlobalRuleRow {
  id: string;
  Rule_ID: string;
  Policy_Name: string;
  Specification: string;
}

// ===== 데이터 모델 =====
export interface DataModelRow {
  id: string;
  Model_Name: string;
  Field_Name: string;
  Data_Type: string;
  Description: string;
  Is_Nullable: string;
  Default_Value: string;
  Is_Indexed: string;
  Relationship: string;
}

// ===== 기능 & 로직 정의 =====
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

// ===== 디자인 시스템 =====
export interface DesignTokenRow {
  id: string;
  Category: string;
  Token_Name: string;
  Value: string;
  Description: string;
}

// ===== Screen Map =====
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

// ===== Error Dictionary =====
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

// ===== Union & Tab Types =====
export type SheetRow =
  | MetaRow
  | GlobalRuleRow
  | DataModelRow
  | FeatureRow
  | DesignTokenRow
  | ScreenRow
  | ErrorRow;

export type TabName =
  | 'meta'
  | 'rules'
  | 'dataModel'
  | 'features'
  | 'design'
  | 'screens'
  | 'errors';

export interface TabConfig {
  key: TabName;
  label: string;
  emoji: string;
  columns: { key: string; label: string; width?: number }[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  actions?: ActionResult[];
  timestamp: number;
}

export interface ActionResult {
  type: 'add' | 'update' | 'delete';
  tab: TabName;
  rowId?: string;
  summary: string;
}
