/// <reference types="chrome" />

let ws: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
let reconnectAttempt = 0;
const MAX_RECONNECT_DELAY = 30000;

interface ConnectMessage {
  type: 'connect_ws';
  serverUrl: string;
  token: string;
  sheetId: string;
}

function connectWebSocket(serverUrl: string, token: string, sheetId: string) {
  if (ws) {
    ws.close();
    ws = null;
  }

  const wsUrl = serverUrl.replace(/^http/, 'ws');
  ws = new WebSocket(`${wsUrl}/ws?sheetId=${sheetId}&token=${token}`);

  ws.onopen = () => {
    reconnectAttempt = 0;
    console.log('[Sindri WS] Connected');
  };

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      // Forward to side panel
      chrome.runtime.sendMessage({ type: 'ws_message', data }).catch(() => {
        // Side panel might not be open — ignore
      });
    } catch {
      // Ignore non-JSON messages (pong etc.)
    }
  };

  ws.onclose = () => {
    console.log('[Sindri WS] Disconnected');
    ws = null;
    scheduleReconnect(serverUrl, token, sheetId);
  };

  ws.onerror = () => {
    // onclose will fire after this
  };
}

function scheduleReconnect(serverUrl: string, token: string, sheetId: string) {
  if (reconnectTimer) clearTimeout(reconnectTimer);

  const delay = Math.min(1000 * Math.pow(2, reconnectAttempt), MAX_RECONNECT_DELAY);
  reconnectAttempt++;

  reconnectTimer = setTimeout(() => {
    connectWebSocket(serverUrl, token, sheetId);
  }, delay);
}

function disconnectWebSocket() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = undefined;
  }
  reconnectAttempt = 0;
  if (ws) {
    ws.close();
    ws = null;
  }
}

// Listen for messages from side panel
chrome.runtime.onMessage.addListener(
  (message: ConnectMessage | { type: string }, _sender, sendResponse) => {
    if (message.type === 'connect_ws' && 'serverUrl' in message) {
      connectWebSocket(message.serverUrl, message.token, message.sheetId);
      sendResponse({ ok: true });
    } else if (message.type === 'disconnect_ws') {
      disconnectWebSocket();
      sendResponse({ ok: true });
    }
    return false;
  },
);

// Open side panel when extension icon is clicked
chrome.action.onClicked.addListener((tab) => {
  if (tab.id) {
    chrome.sidePanel.open({ tabId: tab.id });
  }
});

// Keep-alive: ping WS every 25 seconds using alarms
chrome.alarms.create('ws-keepalive', { periodInMinutes: 0.4 });
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'ws-keepalive' && ws && ws.readyState === WebSocket.OPEN) {
    ws.send('ping');
  }
});

// Restore WS connection when service worker wakes up
chrome.storage.local.get(
  ['sindri_token', 'sindri_server_url', 'sindri_sheet_id'],
  (data) => {
    if (data.sindri_token && data.sindri_sheet_id) {
      connectWebSocket(
        data.sindri_server_url || 'http://localhost:3100',
        data.sindri_token,
        data.sindri_sheet_id,
      );
    }
  },
);
