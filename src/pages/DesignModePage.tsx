import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';
import { useSheetStore } from '../store/sheetStore';
import { useSheetSync } from '../hooks/useSheetSync';
import { useChatStore } from '../store/chatStore';
import { useDesignStore } from '../store/designStore';
import DesignModeHeader from '../components/design/DesignModeHeader';
import FullScreenFigmaEmbed from '../components/design/FullScreenFigmaEmbed';
import WireframeCanvas from '../components/design/editor/WireframeCanvas';
import LayerPanel from '../components/design/editor/LayerPanel';
import PropertyPanel from '../components/design/editor/PropertyPanel';
import DesignChatPanel from '../components/design/DesignChatPanel';

export default function DesignModePage() {
    const { projectId, sheetId } = useParams<{ projectId: string; sheetId: string }>();
    const navigate = useNavigate();
    const loadSheet = useSheetStore((s) => s.loadSheet);
    const isLoading = useSheetStore((s) => s.isLoading);
    const error = useSheetStore((s) => s.error);
    const { showApiKeyModal, setShowApiKeyModal } = useChatStore();

    const [isChatOpen, setIsChatOpen] = useState(true);
    const viewMode = useDesignStore((s) => s.viewMode);

    useEffect(() => {
        if (sheetId) {
            loadSheet(sheetId);
        }
    }, [sheetId, loadSheet]);

    useSheetSync(sheetId);

    const handleBack = () => {
        navigate(`/projects/${projectId}/sheets/${sheetId}`);
    };

    if (isLoading) {
        return (
            <div className="design-mode">
                <div className="loading-state">데이터 로딩 중...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="design-mode">
                <div className="error-state">오류: {error}</div>
            </div>
        );
    }

    return (
        <div className="design-mode">
            <DesignModeHeader
                onBack={handleBack}
                isChatOpen={isChatOpen}
                onToggleChat={() => setIsChatOpen(!isChatOpen)}
            />
            <div className="design-mode-body">
                {viewMode === 'editor' && <LayerPanel />}
                <div className="design-canvas-area">
                    {viewMode === 'editor' ? (
                        <WireframeCanvas sheetId={sheetId} />
                    ) : (
                        <FullScreenFigmaEmbed />
                    )}
                </div>
                {isChatOpen && (
                    <div className="design-right-panel">
                        <DesignChatPanel onClose={() => setIsChatOpen(false)} />
                        {viewMode === 'editor' && <PropertyPanel />}
                    </div>
                )}
                {!isChatOpen && (
                    <button
                        className="design-chat-fab"
                        onClick={() => setIsChatOpen(true)}
                        title="AI 채팅 열기"
                    >
                        <MessageCircle size={24} />
                    </button>
                )}
            </div>

            {/* Reuse the existing settings modal from Header */}
            {showApiKeyModal && (
                <SettingsModal onClose={() => setShowApiKeyModal(false)} />
            )}
        </div>
    );
}

// Minimal settings modal for design mode (API keys + Figma token)
function SettingsModal({ onClose }: { onClose: () => void }) {
    const {
        provider, apiKeys, model, figmaAccessToken,
        setProvider, setApiKey, setModel, setFigmaAccessToken,
    } = useChatStore();

    const [tempProvider, setTempProvider] = useState(provider);
    const [tempKeys, setTempKeys] = useState({ ...apiKeys });
    const [tempModel, setTempModel] = useState(model);
    const [tempFigmaToken, setTempFigmaToken] = useState(figmaAccessToken);

    const modelOptions = {
        openai: [
            { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
            { value: 'gpt-4o', label: 'GPT-4o' },
        ],
        anthropic: [
            { value: 'claude-sonnet-4-5-20250929', label: 'Claude Sonnet 4.5' },
            { value: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5' },
        ],
        gemini: [
            { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
            { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
        ],
    } as const;

    const handleSave = () => {
        setProvider(tempProvider);
        setApiKey('openai', tempKeys.openai);
        setApiKey('anthropic', tempKeys.anthropic);
        setApiKey('gemini', tempKeys.gemini);
        setModel(tempModel);
        setFigmaAccessToken(tempFigmaToken);
        onClose();
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
                <h2>AI 설정</h2>
                <div className="provider-tabs">
                    {(['openai', 'anthropic', 'gemini'] as const).map((p) => (
                        <button
                            key={p}
                            className={`provider-tab ${tempProvider === p ? 'active' : ''}`}
                            onClick={() => {
                                setTempProvider(p);
                                setTempModel(modelOptions[p][0].value);
                            }}
                        >
                            {p === 'openai' ? 'OpenAI' : p === 'anthropic' ? 'Claude' : 'Gemini'}
                        </button>
                    ))}
                </div>
                <div className="modal-field">
                    <label className="modal-label">API Key</label>
                    <input
                        type="password"
                        className="modal-input"
                        value={tempKeys[tempProvider]}
                        onChange={(e) => setTempKeys({ ...tempKeys, [tempProvider]: e.target.value })}
                    />
                </div>
                <div className="modal-field">
                    <label className="modal-label">모델</label>
                    <select
                        className="modal-select"
                        value={tempModel}
                        onChange={(e) => setTempModel(e.target.value)}
                    >
                        {modelOptions[tempProvider].map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                </div>
                <div className="modal-divider" />
                <div className="modal-field">
                    <label className="modal-label">Figma Access Token</label>
                    <input
                        type="password"
                        className="modal-input"
                        placeholder="figd_..."
                        value={tempFigmaToken}
                        onChange={(e) => setTempFigmaToken(e.target.value)}
                    />
                </div>
                <div className="modal-actions">
                    <button className="btn secondary" onClick={onClose}>취소</button>
                    <button className="btn primary" onClick={handleSave}>저장</button>
                </div>
            </div>
        </div>
    );
}
