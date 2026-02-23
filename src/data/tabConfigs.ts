import type { TabConfig, TabName } from '../types/sheets.js';

export const TAB_CONFIGS: TabConfig[] = [
    {
        key: 'meta',
        label: '메타 & 커뮤니케이션',
        emoji: '📋',
        columns: [
            { key: 'Project_ID', label: 'Project ID', width: 100 },
            { key: 'Project_Name', label: 'Project Name', width: 150 },
            { key: 'Project_Vision', label: 'Vision', width: 250 },
            { key: 'Owner', label: 'Owner', width: 120 },
            { key: 'Stakeholders', label: 'Stakeholders', width: 150 },
            { key: 'Overall_Status', label: 'Status', width: 100 },
            { key: 'Version', label: 'Version', width: 80 },
            { key: 'Changelog', label: 'Changelog', width: 200 },
        ],
    },
    {
        key: 'rules',
        label: '전역 규칙 & 정책',
        emoji: '📜',
        columns: [
            { key: 'Rule_ID', label: 'Rule ID', width: 100 },
            { key: 'Policy_Name', label: 'Policy Name', width: 200 },
            { key: 'Specification', label: 'Specification', width: 400 },
        ],
    },
    {
        key: 'dataModel',
        label: '데이터 모델',
        emoji: '📦',
        columns: [
            { key: 'Model_Name', label: 'Model Name', width: 120 },
            { key: 'Field_Name', label: 'Field Name', width: 120 },
            { key: 'Data_Type', label: 'Data Type', width: 100 },
            { key: 'Description', label: 'Description', width: 200 },
            { key: 'Is_Nullable', label: 'Nullable', width: 80 },
            { key: 'Default_Value', label: 'Default', width: 100 },
            { key: 'Is_Indexed', label: 'Indexed', width: 80 },
            { key: 'Relationship', label: 'Relationship', width: 150 },
        ],
    },
    {
        key: 'features',
        label: '기능 & 로직',
        emoji: '📄',
        columns: [
            { key: 'Feat_ID', label: 'Feat ID', width: 100 },
            { key: 'Step', label: 'Step', width: 60 },
            { key: 'Description', label: 'Description', width: 200 },
            { key: 'Command_Type', label: 'Command Type', width: 120 },
            { key: 'Command_Detail', label: 'Command Detail', width: 150 },
            { key: 'Target_Type', label: 'Target Type', width: 100 },
            { key: 'Target_ID', label: 'Target ID', width: 100 },
            { key: 'Input_Source', label: 'Input Source', width: 100 },
            { key: 'Input_Payload', label: 'Input Payload', width: 150 },
        ],
    },
    {
        key: 'design',
        label: '디자인 시스템',
        emoji: '🎨',
        columns: [
            { key: 'Category', label: 'Category', width: 120 },
            { key: 'Token_Name', label: 'Token Name', width: 180 },
            { key: 'Value', label: 'Value', width: 150 },
            { key: 'Description', label: 'Description', width: 250 },
        ],
    },
    {
        key: 'screens',
        label: 'Screen Map',
        emoji: '🗺️',
        columns: [
            { key: 'Screen_ID', label: 'Screen ID', width: 100 },
            { key: 'Screen_Name', label: 'Screen Name', width: 150 },
            { key: 'Description', label: 'Description', width: 200 },
            { key: 'Figma_Frame_Name', label: 'Figma Frame', width: 150 },
            { key: 'Related_Feat_ID', label: 'Related Feat', width: 120 },
            { key: 'Parent_Screen', label: 'Parent Screen', width: 120 },
            { key: 'Access_Level', label: 'Access Level', width: 100 },
            { key: 'Status', label: 'Status', width: 100 },
        ],
    },
    {
        key: 'errors',
        label: 'Error Dictionary',
        emoji: '🚨',
        columns: [
            { key: 'Error_ID', label: 'Error ID', width: 100 },
            { key: 'Related_Feat_ID', label: 'Related Feat', width: 120 },
            { key: 'Screen_ID', label: 'Screen ID', width: 100 },
            { key: 'Error_Type', label: 'Error Type', width: 120 },
            { key: 'Severity', label: 'Severity', width: 80 },
            { key: 'User_Message_KO', label: '한국어 메시지', width: 200 },
            { key: 'User_Message_EN', label: 'English Message', width: 200 },
            { key: 'Trigger_Condition', label: 'Trigger Condition', width: 180 },
            { key: 'Recovery_Action', label: 'Recovery Action', width: 180 },
        ],
    },
];

export function getTabConfig(tabName: TabName): TabConfig {
    return TAB_CONFIGS.find((t) => t.key === tabName)!;
}
