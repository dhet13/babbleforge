import type {
    ScreenRow, DesignTokenRow, FeatureRow, MetaRow, ErrorRow,
    PluginMessage,
} from './types';

// ─── State ──────────────────────────────────────────────────────────────────
let serverUrl = '';
let mcpToken = '';
let sheetId = '';

let screens: ScreenRow[] = [];
let tokens: DesignTokenRow[] = [];
let features: FeatureRow[] = [];
let meta: MetaRow | null = null;
let errors: ErrorRow[] = [];

// ─── DOM Elements ───────────────────────────────────────────────────────────
const $ = (id: string) => document.getElementById(id)!;
const serverUrlInput = $('server-url') as HTMLInputElement;
const mcpTokenInput = $('mcp-token') as HTMLInputElement;
const sheetIdInput = $('sheet-id') as HTMLInputElement;
const connectBtn = $('connect-btn') as HTMLButtonElement;
const statusDot = $('status-dot');
const statusText = $('status-text');
const connError = $('conn-error');
const dataSection = $('data-section');
const projectNameEl = $('project-name');
const projectVersionEl = $('project-version');
const screenListEl = $('screen-list');
const selectAllBtn = $('select-all-btn');
const generateAllBtn = $('generate-all-btn') as HTMLButtonElement;
const generateSelectedBtn = $('generate-selected-btn') as HTMLButtonElement;
const syncTokensBtn = $('sync-tokens-btn') as HTMLButtonElement;
const progressSection = $('progress-section');
const progressBar = $('progress-bar');
const progressText = $('progress-text');
const importSection = $('import-section');
const importLatestBtn = $('import-latest-btn') as HTMLButtonElement;
const importStatus = $('import-status');

// ─── Load saved credentials ─────────────────────────────────────────────────
function loadSaved() {
    try {
        const saved = localStorage.getItem('sindri-plugin-config');
        if (saved) {
            const config = JSON.parse(saved);
            serverUrlInput.value = config.serverUrl || 'http://localhost:3100';
            mcpTokenInput.value = config.mcpToken || '';
            sheetIdInput.value = config.sheetId || '';
        }
    } catch { /* ignore */ }
}

function saveConfig() {
    localStorage.setItem('sindri-plugin-config', JSON.stringify({
        serverUrl: serverUrlInput.value,
        mcpToken: mcpTokenInput.value,
        sheetId: sheetIdInput.value,
    }));
}

// ─── Connection ─────────────────────────────────────────────────────────────
async function connect() {
    serverUrl = serverUrlInput.value.replace(/\/$/, '');
    mcpToken = mcpTokenInput.value.trim();
    sheetId = sheetIdInput.value.trim();

    if (!serverUrl || !mcpToken || !sheetId) {
        showError('모든 필드를 입력해주세요.');
        return;
    }

    connectBtn.disabled = true;
    connectBtn.textContent = '연결 중...';
    hideError();

    try {
        const res = await fetch(`${serverUrl}/api/v1/sheets/${sheetId}`, {
            headers: { 'Authorization': `Bearer ${mcpToken}` },
        });

        if (!res.ok) {
            throw new Error(`HTTP ${res.status}: ${await res.text()}`);
        }

        const json = await res.json();
        const data = json.data || json;

        // Extract tab data
        screens = (data.screens || []) as ScreenRow[];
        tokens = (data.design || []) as DesignTokenRow[];
        features = (data.features || []) as FeatureRow[];
        errors = (data.errors || []) as ErrorRow[];
        const metaList = (data.meta || []) as MetaRow[];
        meta = metaList[0] || null;

        // Update UI
        setConnected(true);
        saveConfig();
        renderSheetData();
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : '연결 실패';
        showError(msg);
        setConnected(false);
    } finally {
        connectBtn.disabled = false;
        connectBtn.textContent = '연결';
    }
}

function setConnected(connected: boolean) {
    statusDot.className = `status-dot ${connected ? 'connected' : 'disconnected'}`;
    statusText.textContent = connected ? '연결됨' : '연결 안됨';
    dataSection.classList.toggle('hidden', !connected);
    importSection.classList.toggle('hidden', !connected);
}

function showError(msg: string) {
    connError.textContent = msg;
    connError.classList.remove('hidden');
    statusDot.className = 'status-dot error';
    statusText.textContent = '오류';
}

function hideError() {
    connError.classList.add('hidden');
}

// ─── Render Sheet Data ──────────────────────────────────────────────────────
function renderSheetData() {
    if (meta) {
        projectNameEl.textContent = meta.Project_Name || 'Untitled';
        projectVersionEl.textContent = meta.Version || '';
    }

    screenListEl.innerHTML = '';
    for (const screen of screens) {
        const item = document.createElement('div');
        item.className = 'screen-item';

        const statusClass = screen.Status
            .toLowerCase()
            .replace(/\s+/g, '-');

        item.innerHTML = `
            <input type="checkbox" class="screen-checkbox" data-id="${screen.id}" checked />
            <div class="screen-info">
                <div class="screen-id">${screen.Screen_ID}</div>
                <div class="screen-name">${screen.Screen_Name}</div>
            </div>
            <span class="screen-status ${statusClass}">${screen.Status}</span>
        `;
        screenListEl.appendChild(item);
    }
}

function getSelectedScreens(): ScreenRow[] {
    const checkboxes = screenListEl.querySelectorAll<HTMLInputElement>('.screen-checkbox:checked');
    const selectedIds = new Set(Array.from(checkboxes).map(cb => cb.dataset.id));
    return screens.filter(s => selectedIds.has(s.id));
}

// ─── Actions ────────────────────────────────────────────────────────────────
function sendToPlugin(msg: PluginMessage) {
    parent.postMessage({ pluginMessage: msg }, '*');
}

function generateScreens(targetScreens: ScreenRow[]) {
    if (targetScreens.length === 0) return;

    progressSection.classList.remove('hidden');
    progressBar.style.width = '0%';
    progressText.textContent = `0/${targetScreens.length} 스크린 생성 중...`;

    generateAllBtn.disabled = true;
    generateSelectedBtn.disabled = true;

    sendToPlugin({
        type: 'generate-screens',
        screens: targetScreens,
        tokens,
        features,
        meta: meta!,
        errors,
    });
}

function syncTokens() {
    syncTokensBtn.disabled = true;
    syncTokensBtn.textContent = '동기화 중...';

    sendToPlugin({
        type: 'sync-tokens',
        tokens,
    });
}

// ─── Import from Sindri Editor ──────────────────────────────────────────────
async function importLatestDesign() {
    importLatestBtn.disabled = true;
    importStatus.textContent = '가져오는 중...';

    try {
        const res = await fetch(`${serverUrl}/api/v1/sheets/${sheetId}/designs/latest`, {
            headers: { 'Authorization': `Bearer ${mcpToken}` },
        });

        if (!res.ok) {
            if (res.status === 404) {
                throw new Error('저장된 디자인이 없습니다. 웹 에디터에서 디자인을 먼저 생성해주세요.');
            }
            throw new Error(`HTTP ${res.status}: ${await res.text()}`);
        }

        const design = await res.json();
        importStatus.textContent = `"${design.name}" 디자인을 Figma에 생성 중...`;

        sendToPlugin({
            type: 'import-design',
            design,
        });
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : '가져오기 실패';
        importStatus.textContent = `오류: ${msg}`;
        importLatestBtn.disabled = false;
    }
}

// Mark screen as design-complete on server
async function markComplete(screen: ScreenRow) {
    try {
        await fetch(`${serverUrl}/api/v1/sheets/${sheetId}/tabs/screens/rows/${screen.id}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${mcpToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ updates: { Status: 'Design Complete' } }),
        });
    } catch { /* ignore for now */ }
}

// ─── Messages from Plugin Sandbox ───────────────────────────────────────────
window.onmessage = (event: MessageEvent) => {
    const msg = event.data?.pluginMessage as PluginMessage | undefined;
    if (!msg) return;

    if (msg.type === 'progress') {
        const pct = Math.round((msg.current / msg.total) * 100);
        progressBar.style.width = `${pct}%`;
        progressText.textContent = `${msg.current}/${msg.total} — ${msg.screenName}`;
    }

    if (msg.type === 'complete') {
        progressBar.style.width = '100%';
        progressText.textContent = `완료! ${msg.generatedCount}개 스크린 생성됨`;
        generateAllBtn.disabled = false;
        generateSelectedBtn.disabled = false;
    }

    if (msg.type === 'error') {
        progressText.textContent = `오류: ${msg.message}`;
        generateAllBtn.disabled = false;
        generateSelectedBtn.disabled = false;
        syncTokensBtn.disabled = false;
        syncTokensBtn.textContent = '토큰 동기화';
        importLatestBtn.disabled = false;
        importStatus.textContent = `오류: ${msg.message}`;
    }

    if (msg.type === 'import-design-complete') {
        importStatus.textContent = `완료! ${msg.nodeCount}개 요소가 Figma에 생성되었습니다.`;
        importLatestBtn.disabled = false;
        setTimeout(() => { importStatus.textContent = ''; }, 5000);
    }

    // Token sync complete reuses 'complete' with 0 screens
    if (msg.type === 'complete' && msg.generatedCount === 0) {
        syncTokensBtn.disabled = false;
        syncTokensBtn.textContent = '토큰 동기화 ✓';
        setTimeout(() => { syncTokensBtn.textContent = '토큰 동기화'; }, 2000);
    }
};

// ─── Event Listeners ────────────────────────────────────────────────────────
connectBtn.addEventListener('click', connect);
generateAllBtn.addEventListener('click', () => generateScreens(screens));
generateSelectedBtn.addEventListener('click', () => generateScreens(getSelectedScreens()));
syncTokensBtn.addEventListener('click', syncTokens);
importLatestBtn.addEventListener('click', importLatestDesign);

selectAllBtn.addEventListener('click', () => {
    const checkboxes = screenListEl.querySelectorAll<HTMLInputElement>('.screen-checkbox');
    const allChecked = Array.from(checkboxes).every(cb => cb.checked);
    checkboxes.forEach(cb => { cb.checked = !allChecked; });
    selectAllBtn.textContent = allChecked ? '전체 선택' : '전체 해제';
});

// Load saved config on init
loadSaved();

// Export for bidirectional sync
(window as unknown as Record<string, unknown>).markComplete = markComplete;
