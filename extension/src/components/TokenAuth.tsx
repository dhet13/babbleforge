import { useState } from 'react';
import { Plug, Server } from 'lucide-react';
import { useAuthStore } from '../store/authStore.ts';
import { api } from '../services/apiClient.ts';
import { useSheetStore } from '../store/sheetStore.ts';

export default function TokenAuth() {
  const { serverUrl, setToken, setServerUrl, setConnected, setError } = useAuthStore();
  const loadSheet = useSheetStore((s) => s.loadSheet);
  const [tokenInput, setTokenInput] = useState('');
  const [urlInput, setUrlInput] = useState(serverUrl);
  const [isConnecting, setIsConnecting] = useState(false);
  const [showUrl, setShowUrl] = useState(false);

  async function handleConnect() {
    if (!tokenInput.trim()) return;

    setIsConnecting(true);
    setError(null);

    try {
      await setToken(tokenInput.trim());
      if (urlInput !== serverUrl) {
        await setServerUrl(urlInput.trim());
      }

      const result = await api.validateToken();
      setConnected(result.sheetId, result.projectId);
      await loadSheet();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsConnecting(false);
    }
  }

  return (
    <div className="token-auth">
      <div className="auth-header">
        <div className="auth-logo">
          <span className="accent">Sindri</span> Sheet
        </div>
        <p className="auth-desc">
          MCP 토큰을 입력하여 프로젝트에 연결하세요.
          <br />
          토큰은 웹 대시보드에서 생성할 수 있습니다.
        </p>
      </div>

      <div className="auth-form">
        <div className="input-group">
          <label>MCP 토큰</label>
          <div className="input-with-icon">
            <Plug size={14} />
            <input
              type="password"
              placeholder="sindri_xxxxxxxxxxxxxxxx"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleConnect()}
            />
          </div>
        </div>

        <button className="toggle-url" onClick={() => setShowUrl(!showUrl)}>
          <Server size={12} />
          서버 URL {showUrl ? '숨기기' : '변경'}
        </button>

        {showUrl && (
          <div className="input-group">
            <label>서버 URL</label>
            <input
              type="url"
              placeholder="http://localhost:3100"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
            />
          </div>
        )}

        <button
          className="btn-connect"
          onClick={handleConnect}
          disabled={isConnecting || !tokenInput.trim()}
        >
          {isConnecting ? '연결 중...' : '연결'}
        </button>
      </div>
    </div>
  );
}
