import { useState } from 'react';
import { Settings, Download, FileJson, FileSpreadsheet, Trash2, LogOut, ArrowLeft, PenTool, Palette } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useChatStore, MODEL_OPTIONS } from '../store/chatStore';
import type { AiProvider } from '../store/chatStore';
import { useAuthStore } from '../store/authStore';
import { useFigmaStore } from '../store/figmaStore';
import { exportToExcel, exportToJSON } from '../services/exportService';

export default function Header() {
    const {
        provider, apiKeys, model, figmaAccessToken,
        setProvider, setApiKey, setModel, setFigmaAccessToken,
        showApiKeyModal, setShowApiKeyModal, clearMessages,
    } = useChatStore();
    const { user, logout } = useAuthStore();
    const { isEmbedVisible, toggleEmbed } = useFigmaStore();
    const navigate = useNavigate();
    const { projectId, sheetId } = useParams<{ projectId: string; sheetId: string }>();
    const [showExport, setShowExport] = useState(false);

    // Modal local state
    const [tempProvider, setTempProvider] = useState<AiProvider>(provider);
    const [tempKeys, setTempKeys] = useState({ ...apiKeys });
    const [tempModel, setTempModel] = useState(model);
    const [tempFigmaToken, setTempFigmaToken] = useState(figmaAccessToken);

    const hasKey = !!apiKeys[provider];

    const handleOpenModal = () => {
        setTempProvider(provider);
        setTempKeys({ ...apiKeys });
        setTempModel(model);
        setTempFigmaToken(figmaAccessToken);
        setShowApiKeyModal(true);
    };

    const handleSave = () => {
        setProvider(tempProvider);
        setApiKey('openai', tempKeys.openai);
        setApiKey('anthropic', tempKeys.anthropic);
        setApiKey('gemini', tempKeys.gemini);
        setModel(tempModel);
        setFigmaAccessToken(tempFigmaToken);
        setShowApiKeyModal(false);
    };

    const handleProviderTab = (p: AiProvider) => {
        setTempProvider(p);
        // Switch to default model for the new provider
        const defaultModel = MODEL_OPTIONS[p][0].value;
        setTempModel(defaultModel);
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
                    {projectId && sheetId && (
                        <button
                            className="header-btn design-mode-btn"
                            onClick={() => navigate(`/projects/${projectId}/sheets/${sheetId}/design`)}
                            title="전체화면 디자인 모드"
                        >
                            <Palette size={16} />
                            <span>Design Mode</span>
                        </button>
                    )}
                    <button
                        className={`header-btn ${isEmbedVisible ? 'figma-active' : ''}`}
                        onClick={toggleEmbed}
                        title={isEmbedVisible ? 'Figma 닫기' : 'Figma 열기'}
                    >
                        <PenTool size={16} />
                        <span>Figma</span>
                    </button>

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
                        className={`header-btn ${hasKey ? 'configured' : 'warning'}`}
                        onClick={handleOpenModal}
                    >
                        <Settings size={16} />
                        <span>{hasKey ? `${provider === 'openai' ? 'OpenAI' : provider === 'anthropic' ? 'Claude' : 'Gemini'} 설정됨` : 'API 키 필요'}</span>
                    </button>
                </div>
            </header>

            {showApiKeyModal && (
                <div className="modal-overlay" onClick={() => setShowApiKeyModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <h2>AI 설정</h2>
                        <p className="modal-desc">
                            AI 프로바이더를 선택하고 API 키를 입력하세요.
                            키는 브라우저에만 저장됩니다.
                        </p>

                        <div className="provider-tabs">
                            <button
                                className={`provider-tab ${tempProvider === 'openai' ? 'active' : ''}`}
                                onClick={() => handleProviderTab('openai')}
                            >
                                OpenAI
                            </button>
                            <button
                                className={`provider-tab ${tempProvider === 'anthropic' ? 'active' : ''}`}
                                onClick={() => handleProviderTab('anthropic')}
                            >
                                Claude
                            </button>
                            <button
                                className={`provider-tab ${tempProvider === 'gemini' ? 'active' : ''}`}
                                onClick={() => handleProviderTab('gemini')}
                            >
                                Gemini
                            </button>
                        </div>

                        <div className="modal-field">
                            <label className="modal-label">API Key</label>
                            <input
                                type="password"
                                placeholder={tempProvider === 'openai' ? 'sk-...' : tempProvider === 'anthropic' ? 'sk-ant-...' : 'AIza...'}
                                value={tempKeys[tempProvider]}
                                onChange={(e) =>
                                    setTempKeys({ ...tempKeys, [tempProvider]: e.target.value })
                                }
                                className="modal-input"
                                autoFocus
                            />
                        </div>

                        <div className="modal-field">
                            <label className="modal-label">모델</label>
                            <select
                                className="modal-select"
                                value={tempModel}
                                onChange={(e) => setTempModel(e.target.value)}
                            >
                                {MODEL_OPTIONS[tempProvider].map((opt) => (
                                    <option key={opt.value} value={opt.value}>
                                        {opt.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="modal-divider" />

                        <div className="modal-field">
                            <label className="modal-label">Figma Access Token</label>
                            <input
                                type="password"
                                placeholder="figd_..."
                                value={tempFigmaToken}
                                onChange={(e) => setTempFigmaToken(e.target.value)}
                                className="modal-input"
                            />
                            <span className="modal-hint">
                                Figma Settings &gt; Personal Access Tokens에서 생성
                            </span>
                        </div>

                        <div className="modal-actions">
                            <button className="btn secondary" onClick={() => setShowApiKeyModal(false)}>
                                취소
                            </button>
                            <button className="btn primary" onClick={handleSave}>
                                저장
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
