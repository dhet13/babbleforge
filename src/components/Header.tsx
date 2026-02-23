import { useState } from 'react';
import { Settings, Download, FileJson, FileSpreadsheet, Trash2, LogOut, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useChatStore } from '../store/chatStore';
import { useAuthStore } from '../store/authStore';
import { exportToExcel, exportToJSON } from '../services/exportService';

export default function Header() {
    const { apiKey, setApiKey, showApiKeyModal, setShowApiKeyModal, clearMessages } = useChatStore();
    const { user, logout } = useAuthStore();
    const navigate = useNavigate();
    const [tempKey, setTempKey] = useState(apiKey);
    const [showExport, setShowExport] = useState(false);

    const handleSaveKey = () => {
        setApiKey(tempKey);
        setShowApiKeyModal(false);
    };

    return (
        <>
            <header className="app-header">
                <div className="header-left">
                    <div className="logo">
                        <span className="logo-icon">⚒️</span>
                        <h1>Sindri Sheet Manager</h1>
                    </div>
                    <span className="version-badge">Blueprint AI v0.8</span>
                </div>

                <div className="header-right">
                    {user && (
                        <>
                            <span className="user-badge">{user.name}</span>
                            <button
                                className="header-btn"
                                onClick={() => navigate('/dashboard')}
                                title="대시보드"
                            >
                                <ArrowLeft size={16} />
                            </button>
                            <button
                                className="header-btn"
                                onClick={logout}
                                title="로그아웃"
                            >
                                <LogOut size={16} />
                            </button>
                        </>
                    )}
                    <button
                        className="header-btn"
                        onClick={clearMessages}
                        title="채팅 초기화"
                    >
                        <Trash2 size={16} />
                    </button>

                    <div className="export-dropdown">
                        <button
                            className="header-btn primary"
                            onClick={() => setShowExport(!showExport)}
                        >
                            <Download size={16} />
                            <span>Export</span>
                        </button>
                        {showExport && (
                            <div className="dropdown-menu">
                                <button
                                    onClick={() => {
                                        exportToExcel();
                                        setShowExport(false);
                                    }}
                                >
                                    <FileSpreadsheet size={16} />
                                    <span>Excel (.xlsx)</span>
                                </button>
                                <button
                                    onClick={() => {
                                        exportToJSON();
                                        setShowExport(false);
                                    }}
                                >
                                    <FileJson size={16} />
                                    <span>JSON (.json)</span>
                                </button>
                            </div>
                        )}
                    </div>

                    <button
                        className={`header-btn ${apiKey ? 'configured' : 'warning'}`}
                        onClick={() => {
                            setTempKey(apiKey);
                            setShowApiKeyModal(true);
                        }}
                    >
                        <Settings size={16} />
                        <span>{apiKey ? 'API 설정됨' : 'API 키 필요'}</span>
                    </button>
                </div>
            </header>

            {showApiKeyModal && (
                <div className="modal-overlay" onClick={() => setShowApiKeyModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <h2>🔑 OpenAI API Key 설정</h2>
                        <p className="modal-desc">
                            AI 채팅 기능을 사용하려면 OpenAI API 키가 필요합니다.
                            <br />
                            키는 브라우저에만 저장되며 외부로 전송되지 않습니다.
                        </p>
                        <input
                            type="password"
                            placeholder="sk-..."
                            value={tempKey}
                            onChange={(e) => setTempKey(e.target.value)}
                            className="modal-input"
                            autoFocus
                        />
                        <div className="modal-actions">
                            <button className="btn secondary" onClick={() => setShowApiKeyModal(false)}>
                                취소
                            </button>
                            <button className="btn primary" onClick={handleSaveKey}>
                                저장
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
