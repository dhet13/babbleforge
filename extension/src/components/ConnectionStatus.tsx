import { Wifi, WifiOff, LogOut } from 'lucide-react';
import { useAuthStore } from '../store/authStore.ts';

export default function ConnectionStatus() {
  const { isConnected, error, disconnect } = useAuthStore();

  return (
    <div className="connection-status">
      <div className="status-left">
        <div className={`status-dot ${isConnected ? 'connected' : 'disconnected'}`} />
        {isConnected ? (
          <Wifi size={12} />
        ) : (
          <WifiOff size={12} />
        )}
        <span className="status-text">
          {isConnected ? '연결됨' : error || '연결 끊김'}
        </span>
      </div>
      <button className="btn-disconnect" onClick={disconnect} title="연결 해제">
        <LogOut size={12} />
      </button>
    </div>
  );
}
