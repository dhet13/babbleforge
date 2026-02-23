import type { ScreenRow, DesignTokenRow, FeatureRow } from '../types';
import { getTokenColor } from './tokenMapper';

const FONT_REGULAR = { family: 'Inter', style: 'Regular' };
const FONT_MEDIUM = { family: 'Inter', style: 'Medium' };
const FONT_BOLD = { family: 'Inter', style: 'Bold' };

/** Build wireframe content inside a screen frame based on description keywords */
export async function buildWireframe(
    parent: FrameNode,
    screen: ScreenRow,
    tokens: DesignTokenRow[],
    features: FeatureRow[],
): Promise<void> {
    await figma.loadFontAsync(FONT_REGULAR);
    await figma.loadFontAsync(FONT_MEDIUM);
    await figma.loadFontAsync(FONT_BOLD);

    const desc = (screen.Description + ' ' + screen.Screen_Name).toLowerCase();

    // Content wrapper (takes remaining space below label)
    const content = figma.createFrame();
    content.name = 'content';
    content.layoutMode = 'VERTICAL';
    content.layoutGrow = 1;
    content.layoutAlign = 'STRETCH';
    content.paddingTop = content.paddingBottom = 24;
    content.paddingLeft = content.paddingRight = 24;
    content.itemSpacing = 16;
    content.fills = [];

    // Add header bar
    await addHeaderBar(content, screen, tokens);

    // Keyword-based wireframe content
    if (desc.includes('로그인') || desc.includes('login')) {
        await addLoginForm(content, tokens);
    } else if (desc.includes('목록') || desc.includes('dashboard') || desc.includes('관리')) {
        await addCardGrid(content, tokens);
    } else if (desc.includes('채팅') || desc.includes('chat')) {
        await addChatLayout(content, tokens);
    } else if (desc.includes('편집') || desc.includes('editor')) {
        await addEditorLayout(content, tokens);
    } else if (desc.includes('미리보기') || desc.includes('preview')) {
        await addPreviewLayout(content, tokens);
    } else if (desc.includes('내보내기') || desc.includes('export') || desc.includes('마법사') || desc.includes('wizard')) {
        await addWizardLayout(content, tokens);
    } else {
        await addDefaultLayout(content, screen, tokens);
    }

    // Feature annotations (if any related features)
    const relatedFeats = features.filter(f =>
        screen.Related_Feat_ID && screen.Related_Feat_ID.includes(f.Feat_ID)
    );
    if (relatedFeats.length > 0) {
        await addFeatureAnnotations(content, relatedFeats, tokens);
    }

    parent.appendChild(content);
}

// ─── Component Builders ─────────────────────────────────────────────────────

async function addHeaderBar(parent: FrameNode, screen: ScreenRow, tokens: DesignTokenRow[]) {
    const surfaceColor = getTokenColor(tokens, 'surface', { r: 0.141, g: 0.141, b: 0.141 });
    const accentColor = getTokenColor(tokens, 'primary', { r: 1, g: 0.478, b: 0 });
    const textColor: RGB = { r: 1, g: 1, b: 1 };

    const header = figma.createFrame();
    header.name = 'header';
    header.layoutMode = 'HORIZONTAL';
    header.counterAxisSizingMode = 'AUTO';
    header.layoutAlign = 'STRETCH';
    header.primaryAxisAlignItems = 'SPACE_BETWEEN';
    header.counterAxisAlignItems = 'CENTER';
    header.paddingTop = header.paddingBottom = 12;
    header.paddingLeft = header.paddingRight = 16;
    header.fills = [{ type: 'SOLID', color: surfaceColor }];
    header.cornerRadius = 8;

    // Logo placeholder
    const logo = figma.createText();
    logo.fontName = FONT_BOLD;
    logo.fontSize = 14;
    logo.fills = [{ type: 'SOLID', color: accentColor }];
    logo.characters = '⚒️ Sindri';
    header.appendChild(logo);

    // Page title
    const title = figma.createText();
    title.fontName = FONT_MEDIUM;
    title.fontSize = 13;
    title.fills = [{ type: 'SOLID', color: textColor }];
    title.characters = screen.Screen_Name;
    header.appendChild(title);

    // Nav placeholder
    const nav = figma.createText();
    nav.fontName = FONT_REGULAR;
    nav.fontSize = 12;
    nav.fills = [{ type: 'SOLID', color: { r: 0.627, g: 0.627, b: 0.627 } }];
    nav.characters = '☰ Menu';
    header.appendChild(nav);

    parent.appendChild(header);
}

async function addLoginForm(parent: FrameNode, tokens: DesignTokenRow[]) {
    const surfaceColor = getTokenColor(tokens, 'surface', { r: 0.141, g: 0.141, b: 0.141 });
    const accentColor = getTokenColor(tokens, 'primary', { r: 1, g: 0.478, b: 0 });
    const borderColor = getTokenColor(tokens, 'border', { r: 0.2, g: 0.2, b: 0.2 });

    const formContainer = figma.createFrame();
    formContainer.name = 'login-form';
    formContainer.layoutMode = 'VERTICAL';
    formContainer.layoutGrow = 1;
    formContainer.layoutAlign = 'STRETCH';
    formContainer.primaryAxisAlignItems = 'CENTER';
    formContainer.counterAxisAlignItems = 'CENTER';
    formContainer.itemSpacing = 16;
    formContainer.fills = [];

    const form = figma.createFrame();
    form.name = 'form-card';
    form.layoutMode = 'VERTICAL';
    form.resize(360, 1);
    form.primaryAxisSizingMode = 'AUTO';
    form.paddingTop = form.paddingBottom = 32;
    form.paddingLeft = form.paddingRight = 24;
    form.itemSpacing = 16;
    form.fills = [{ type: 'SOLID', color: surfaceColor }];
    form.cornerRadius = 12;

    // Title
    const title = figma.createText();
    title.fontName = FONT_BOLD;
    title.fontSize = 20;
    title.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
    title.characters = '로그인';
    form.appendChild(title);

    // Email input placeholder
    await addInputPlaceholder(form, '이메일', borderColor);
    // Password input placeholder
    await addInputPlaceholder(form, '비밀번호', borderColor);

    // Login button
    const btn = figma.createFrame();
    btn.name = 'login-btn';
    btn.layoutMode = 'HORIZONTAL';
    btn.primaryAxisAlignItems = 'CENTER';
    btn.counterAxisAlignItems = 'CENTER';
    btn.layoutAlign = 'STRETCH';
    btn.resize(312, 44);
    btn.counterAxisSizingMode = 'FIXED';
    btn.fills = [{ type: 'SOLID', color: accentColor }];
    btn.cornerRadius = 8;

    const btnText = figma.createText();
    btnText.fontName = FONT_BOLD;
    btnText.fontSize = 14;
    btnText.fills = [{ type: 'SOLID', color: { r: 0.06, g: 0.06, b: 0.06 } }];
    btnText.characters = '로그인';
    btn.appendChild(btnText);
    form.appendChild(btn);

    formContainer.appendChild(form);
    parent.appendChild(formContainer);
}

async function addCardGrid(parent: FrameNode, tokens: DesignTokenRow[]) {
    const surfaceColor = getTokenColor(tokens, 'surface', { r: 0.141, g: 0.141, b: 0.141 });
    const borderColor = getTokenColor(tokens, 'border', { r: 0.2, g: 0.2, b: 0.2 });

    // Section title
    const sectionTitle = figma.createText();
    sectionTitle.fontName = FONT_BOLD;
    sectionTitle.fontSize = 16;
    sectionTitle.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
    sectionTitle.characters = '프로젝트 목록';
    parent.appendChild(sectionTitle);

    // Card grid
    const grid = figma.createFrame();
    grid.name = 'card-grid';
    grid.layoutMode = 'HORIZONTAL';
    grid.layoutAlign = 'STRETCH';
    grid.counterAxisSizingMode = 'AUTO';
    grid.layoutGrow = 1;
    grid.itemSpacing = 16;
    grid.layoutWrap = 'WRAP';
    grid.fills = [];

    for (let i = 0; i < 3; i++) {
        const card = figma.createFrame();
        card.name = `card-${i + 1}`;
        card.layoutMode = 'VERTICAL';
        card.resize(420, 1);
        card.primaryAxisSizingMode = 'AUTO';
        card.paddingTop = card.paddingBottom = 20;
        card.paddingLeft = card.paddingRight = 16;
        card.itemSpacing = 8;
        card.fills = [{ type: 'SOLID', color: surfaceColor }];
        card.strokes = [{ type: 'SOLID', color: borderColor }];
        card.strokeWeight = 1;
        card.cornerRadius = 10;

        const cardTitle = figma.createText();
        cardTitle.fontName = FONT_MEDIUM;
        cardTitle.fontSize = 14;
        cardTitle.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
        cardTitle.characters = `프로젝트 ${i + 1}`;
        card.appendChild(cardTitle);

        const cardDesc = figma.createText();
        cardDesc.fontName = FONT_REGULAR;
        cardDesc.fontSize = 12;
        cardDesc.fills = [{ type: 'SOLID', color: { r: 0.627, g: 0.627, b: 0.627 } }];
        cardDesc.characters = '프로젝트 설명이 여기에 표시됩니다';
        card.appendChild(cardDesc);

        grid.appendChild(card);
    }

    parent.appendChild(grid);
}

async function addChatLayout(parent: FrameNode, tokens: DesignTokenRow[]) {
    const surfaceColor = getTokenColor(tokens, 'surface', { r: 0.141, g: 0.141, b: 0.141 });
    const accentColor = getTokenColor(tokens, 'primary', { r: 1, g: 0.478, b: 0 });
    const borderColor = getTokenColor(tokens, 'border', { r: 0.2, g: 0.2, b: 0.2 });

    // Chat container (horizontal: sidebar + messages)
    const chatContainer = figma.createFrame();
    chatContainer.name = 'chat-layout';
    chatContainer.layoutMode = 'HORIZONTAL';
    chatContainer.layoutGrow = 1;
    chatContainer.layoutAlign = 'STRETCH';
    chatContainer.itemSpacing = 0;
    chatContainer.fills = [];

    // Messages area
    const messagesArea = figma.createFrame();
    messagesArea.name = 'messages';
    messagesArea.layoutMode = 'VERTICAL';
    messagesArea.layoutGrow = 1;
    messagesArea.layoutAlign = 'STRETCH';
    messagesArea.paddingTop = messagesArea.paddingBottom = 16;
    messagesArea.paddingLeft = messagesArea.paddingRight = 16;
    messagesArea.itemSpacing = 12;
    messagesArea.fills = [];

    // Sample messages
    const msgs = [
        { role: 'user', text: '로그인 화면을 만들어주세요' },
        { role: 'assistant', text: 'AI가 생성한 응답이 여기에 표시됩니다' },
    ];

    for (const msg of msgs) {
        const bubble = figma.createFrame();
        bubble.name = `msg-${msg.role}`;
        bubble.layoutMode = 'HORIZONTAL';
        bubble.counterAxisSizingMode = 'AUTO';
        bubble.primaryAxisSizingMode = 'AUTO';
        bubble.paddingTop = bubble.paddingBottom = 10;
        bubble.paddingLeft = bubble.paddingRight = 14;
        bubble.cornerRadius = 12;
        bubble.fills = [{ type: 'SOLID', color: msg.role === 'user' ? accentColor : surfaceColor }];

        const bubbleText = figma.createText();
        bubbleText.fontName = FONT_REGULAR;
        bubbleText.fontSize = 13;
        bubbleText.fills = [{ type: 'SOLID', color: msg.role === 'user' ? { r: 0.06, g: 0.06, b: 0.06 } : { r: 1, g: 1, b: 1 } }];
        bubbleText.characters = msg.text;
        bubble.appendChild(bubbleText);

        messagesArea.appendChild(bubble);
    }

    chatContainer.appendChild(messagesArea);

    // Input bar
    const inputBar = figma.createFrame();
    inputBar.name = 'input-bar';
    inputBar.layoutMode = 'HORIZONTAL';
    inputBar.layoutAlign = 'STRETCH';
    inputBar.counterAxisSizingMode = 'AUTO';
    inputBar.paddingTop = inputBar.paddingBottom = 12;
    inputBar.paddingLeft = inputBar.paddingRight = 16;
    inputBar.itemSpacing = 8;
    inputBar.fills = [{ type: 'SOLID', color: surfaceColor }];
    inputBar.strokes = [{ type: 'SOLID', color: borderColor }];
    inputBar.strokeWeight = 1;
    inputBar.strokeTopWeight = 1;
    inputBar.strokeBottomWeight = 0;
    inputBar.strokeLeftWeight = 0;
    inputBar.strokeRightWeight = 0;
    inputBar.cornerRadius = 0;

    await addInputPlaceholder(inputBar, '메시지를 입력하세요...', borderColor);

    parent.appendChild(chatContainer);
    parent.appendChild(inputBar);
}

async function addEditorLayout(parent: FrameNode, tokens: DesignTokenRow[]) {
    const surfaceColor = getTokenColor(tokens, 'surface', { r: 0.141, g: 0.141, b: 0.141 });
    const borderColor = getTokenColor(tokens, 'border', { r: 0.2, g: 0.2, b: 0.2 });

    const editorContainer = figma.createFrame();
    editorContainer.name = 'editor-layout';
    editorContainer.layoutMode = 'HORIZONTAL';
    editorContainer.layoutGrow = 1;
    editorContainer.layoutAlign = 'STRETCH';
    editorContainer.itemSpacing = 1;
    editorContainer.fills = [{ type: 'SOLID', color: borderColor }];

    // Left panel
    const leftPanel = figma.createFrame();
    leftPanel.name = 'tool-panel';
    leftPanel.layoutMode = 'VERTICAL';
    leftPanel.resize(240, 1);
    leftPanel.layoutGrow = 1;
    leftPanel.paddingTop = leftPanel.paddingBottom = 12;
    leftPanel.paddingLeft = leftPanel.paddingRight = 12;
    leftPanel.itemSpacing = 8;
    leftPanel.fills = [{ type: 'SOLID', color: surfaceColor }];

    const toolTitle = figma.createText();
    toolTitle.fontName = FONT_MEDIUM;
    toolTitle.fontSize = 12;
    toolTitle.fills = [{ type: 'SOLID', color: { r: 0.627, g: 0.627, b: 0.627 } }];
    toolTitle.characters = '도구 패널';
    leftPanel.appendChild(toolTitle);

    editorContainer.appendChild(leftPanel);

    // Main canvas
    const canvas = figma.createFrame();
    canvas.name = 'canvas';
    canvas.layoutMode = 'VERTICAL';
    canvas.layoutGrow = 1;
    canvas.layoutAlign = 'STRETCH';
    canvas.primaryAxisAlignItems = 'CENTER';
    canvas.counterAxisAlignItems = 'CENTER';
    canvas.fills = [{ type: 'SOLID', color: { r: 0.08, g: 0.08, b: 0.08 } }];

    const canvasLabel = figma.createText();
    canvasLabel.fontName = FONT_REGULAR;
    canvasLabel.fontSize = 14;
    canvasLabel.fills = [{ type: 'SOLID', color: { r: 0.4, g: 0.4, b: 0.4 } }];
    canvasLabel.characters = '편집 영역';
    canvas.appendChild(canvasLabel);

    editorContainer.appendChild(canvas);
    parent.appendChild(editorContainer);
}

async function addPreviewLayout(parent: FrameNode, tokens: DesignTokenRow[]) {
    const surfaceColor = getTokenColor(tokens, 'surface', { r: 0.141, g: 0.141, b: 0.141 });

    const preview = figma.createFrame();
    preview.name = 'preview-container';
    preview.layoutMode = 'VERTICAL';
    preview.layoutGrow = 1;
    preview.layoutAlign = 'STRETCH';
    preview.primaryAxisAlignItems = 'CENTER';
    preview.counterAxisAlignItems = 'CENTER';
    preview.itemSpacing = 16;
    preview.fills = [{ type: 'SOLID', color: surfaceColor }];
    preview.cornerRadius = 8;

    const label = figma.createText();
    label.fontName = FONT_MEDIUM;
    label.fontSize = 16;
    label.fills = [{ type: 'SOLID', color: { r: 0.627, g: 0.627, b: 0.627 } }];
    label.characters = '미리보기 영역';
    preview.appendChild(label);

    const subLabel = figma.createText();
    subLabel.fontName = FONT_REGULAR;
    subLabel.fontSize = 12;
    subLabel.fills = [{ type: 'SOLID', color: { r: 0.4, g: 0.4, b: 0.4 } }];
    subLabel.characters = '와이어프레임 미리보기가 여기에 표시됩니다';
    preview.appendChild(subLabel);

    parent.appendChild(preview);
}

async function addWizardLayout(parent: FrameNode, tokens: DesignTokenRow[]) {
    const surfaceColor = getTokenColor(tokens, 'surface', { r: 0.141, g: 0.141, b: 0.141 });
    const accentColor = getTokenColor(tokens, 'primary', { r: 1, g: 0.478, b: 0 });

    // Step indicators
    const steps = figma.createFrame();
    steps.name = 'steps';
    steps.layoutMode = 'HORIZONTAL';
    steps.layoutAlign = 'STRETCH';
    steps.counterAxisSizingMode = 'AUTO';
    steps.primaryAxisAlignItems = 'CENTER';
    steps.itemSpacing = 24;
    steps.paddingTop = steps.paddingBottom = 16;
    steps.fills = [];

    const stepLabels = ['1. 형식 선택', '2. 옵션 설정', '3. 미리보기', '4. 다운로드'];
    for (let i = 0; i < stepLabels.length; i++) {
        const stepText = figma.createText();
        stepText.fontName = i === 0 ? FONT_BOLD : FONT_REGULAR;
        stepText.fontSize = 12;
        stepText.fills = [{ type: 'SOLID', color: i === 0 ? accentColor : { r: 0.627, g: 0.627, b: 0.627 } }];
        stepText.characters = stepLabels[i];
        steps.appendChild(stepText);
    }
    parent.appendChild(steps);

    // Content area
    const content = figma.createFrame();
    content.name = 'wizard-content';
    content.layoutMode = 'VERTICAL';
    content.layoutGrow = 1;
    content.layoutAlign = 'STRETCH';
    content.primaryAxisAlignItems = 'CENTER';
    content.counterAxisAlignItems = 'CENTER';
    content.itemSpacing = 16;
    content.fills = [{ type: 'SOLID', color: surfaceColor }];
    content.cornerRadius = 8;

    const contentLabel = figma.createText();
    contentLabel.fontName = FONT_MEDIUM;
    contentLabel.fontSize = 14;
    contentLabel.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
    contentLabel.characters = '내보내기 형식을 선택하세요';
    content.appendChild(contentLabel);

    parent.appendChild(content);
}

async function addDefaultLayout(parent: FrameNode, screen: ScreenRow, tokens: DesignTokenRow[]) {
    const surfaceColor = getTokenColor(tokens, 'surface', { r: 0.141, g: 0.141, b: 0.141 });

    const container = figma.createFrame();
    container.name = 'default-content';
    container.layoutMode = 'VERTICAL';
    container.layoutGrow = 1;
    container.layoutAlign = 'STRETCH';
    container.primaryAxisAlignItems = 'CENTER';
    container.counterAxisAlignItems = 'CENTER';
    container.itemSpacing = 12;
    container.fills = [{ type: 'SOLID', color: surfaceColor }];
    container.cornerRadius = 8;

    const title = figma.createText();
    title.fontName = FONT_BOLD;
    title.fontSize = 18;
    title.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
    title.characters = screen.Screen_Name;
    container.appendChild(title);

    const desc = figma.createText();
    desc.fontName = FONT_REGULAR;
    desc.fontSize = 13;
    desc.fills = [{ type: 'SOLID', color: { r: 0.627, g: 0.627, b: 0.627 } }];
    desc.characters = screen.Description || '화면 설명이 여기에 표시됩니다';
    container.appendChild(desc);

    parent.appendChild(container);
}

async function addFeatureAnnotations(parent: FrameNode, features: FeatureRow[], tokens: DesignTokenRow[]) {
    const borderColor = getTokenColor(tokens, 'border', { r: 0.2, g: 0.2, b: 0.2 });

    const annotations = figma.createFrame();
    annotations.name = 'feature-annotations';
    annotations.layoutMode = 'VERTICAL';
    annotations.layoutAlign = 'STRETCH';
    annotations.layoutAlign = 'STRETCH';
    annotations.primaryAxisSizingMode = 'AUTO';
    annotations.itemSpacing = 4;
    annotations.paddingTop = 8;
    annotations.fills = [];

    const label = figma.createText();
    label.fontName = FONT_MEDIUM;
    label.fontSize = 10;
    label.fills = [{ type: 'SOLID', color: { r: 0.627, g: 0.627, b: 0.627 } }];
    label.characters = '관련 기능:';
    label.layoutAlign = 'STRETCH';
    annotations.appendChild(label);

    for (const feat of features.slice(0, 3)) {
        const featText = figma.createText();
        featText.fontName = FONT_REGULAR;
        featText.fontSize = 10;
        featText.fills = [{ type: 'SOLID', color: { r: 0.4, g: 0.4, b: 0.4 } }];
        featText.characters = `${feat.Feat_ID}: ${feat.Description}`;
        featText.layoutAlign = 'STRETCH';
        annotations.appendChild(featText);
    }

    parent.appendChild(annotations);
}

// ─── Helpers ────────────────────────────────────────────────────────────────

async function addInputPlaceholder(parent: FrameNode, placeholder: string, borderColor: RGB) {
    const input = figma.createFrame();
    input.name = `input-${placeholder}`;
    input.layoutMode = 'HORIZONTAL';
    input.layoutAlign = 'STRETCH';
    input.counterAxisSizingMode = 'AUTO';
    input.paddingTop = input.paddingBottom = 10;
    input.paddingLeft = input.paddingRight = 14;
    input.fills = [{ type: 'SOLID', color: { r: 0.06, g: 0.06, b: 0.06 } }];
    input.strokes = [{ type: 'SOLID', color: borderColor }];
    input.strokeWeight = 1;
    input.cornerRadius = 6;

    const text = figma.createText();
    text.fontName = FONT_REGULAR;
    text.fontSize = 13;
    text.fills = [{ type: 'SOLID', color: { r: 0.4, g: 0.4, b: 0.4 } }];
    text.characters = placeholder;
    input.appendChild(text);

    parent.appendChild(input);
}
