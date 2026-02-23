import { useEffect } from 'react';
import { useAuthStore } from '../store/authStore.ts';
import { useSheetStore } from '../store/sheetStore.ts';
import TokenAuth from '../components/TokenAuth.tsx';
import SheetViewer from '../components/SheetViewer.tsx';
import ConnectionStatus from '../components/ConnectionStatus.tsx';

export default function App() {
  const { isConnected, isLoading, error, loadSaved } = useAuthStore();
  const applyWsMessage = useSheetStore((s) => s.applyWsMessage);
  const loadSheet = useSheetStore((s) => s.loadSheet);
  const sheetIsLoading = useSheetStore((s) => s.isLoading);
  const sheetError = useSheetStore((s) => s.error);

  // Load saved auth on mount
  useEffect(() => {
    loadSaved();
  }, [loadSaved]);

  // Load sheet data when connected
  useEffect(() => {
    if (isConnected) {
      loadSheet();
    }
  }, [isConnected, loadSheet]);

  // Listen for WebSocket messages from service worker
  useEffect(() => {
    function handleMessage(message: { type: string; data?: unknown }) {
      if (message.type === 'ws_message' && message.data) {
        applyWsMessage(message.data as Parameters<typeof applyWsMessage>[0]);
      }
    }

    chrome.runtime.onMessage.addListener(handleMessage);
    return () => chrome.runtime.onMessage.removeListener(handleMessage);
  }, [applyWsMessage]);

  if (isLoading) {
    return (
      <div className="app-loading">
        <div className="spinner-container">
          <div className="spinner" />
          <span>로딩 중...</span>
        </div>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="app-container">
        <TokenAuth />
        {error && <div className="global-error">{error}</div>}
      </div>
    );
  }

  return (
    <div className="app-container connected">
      <ConnectionStatus />
      {sheetIsLoading ? (
        <div className="app-loading">
          <div className="spinner-container">
            <div className="spinner" />
            <span>시트 로딩 중...</span>
          </div>
        </div>
      ) : sheetError ? (
        <div className="global-error">{sheetError}</div>
      ) : (
        <SheetViewer />
      )}
    </div>
  );
}
