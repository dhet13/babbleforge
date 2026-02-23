import { useState } from 'react';
import { ArrowLeft, Download, ExternalLink, Loader2, MessageCircle, MessageCircleOff, Settings, PenTool, Figma } from 'lucide-react';
import { useFigmaStore } from '../../store/figmaStore';
import { useChatStore } from '../../store/chatStore';
import { useDesignStore } from '../../store/designStore';
import { exportFigmaToJSON } from '../../services/figmaExportService';

interface Props {
    onBack: () => void;
    isChatOpen: boolean;
    onToggleChat: () => void;
}

export default function DesignModeHeader({ onBack, isChatOpen, onToggleChat }: Props) {
    const { figmaUrl, figmaFileKey, setFigmaUrl } = useFigmaStore();
    const { figmaAccessToken, setShowApiKeyModal } = useChatStore();
    const viewMode = useDesignStore((s) => s.viewMode);
    const setViewMode = useDesignStore((s) => s.setViewMode);
    const [inputValue, setInputValue] = useState(figmaUrl);
    const [isExporting, setIsExporting] = useState(false);
    const [exportError, setExportError] = useState<string | null>(null);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setFigmaUrl(inputValue.trim());
    };

    const handleExport = async () => {
        if (!figmaFileKey) {
            setExportError('Figma URL을 먼저 입력해주세요.');
            setTimeout(() => setExportError(null), 3000);
            return;
        }
        if (!figmaAccessToken) {
            setExportError('Figma Access Token이 필요합니다.');
            setTimeout(() => setExportError(null), 3000);
            setShowApiKeyModal(true);
            return;
        }

        setIsExporting(true);
        setExportError(null);
        try {
            await exportFigmaToJSON(figmaAccessToken, figmaFileKey);
        } catch (err) {
            const message = err instanceof Error ? err.message : '내보내기 실패';
            setExportError(message);
            setTimeout(() => setExportError(null), 5000);
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div className="design-mode-header">
            <button className="back-btn" onClick={onBack} title="Sheet로 돌아가기">
                <ArrowLeft size={16} />
                <span>Sheet</span>
            </button>

            <div className="view-toggle">
                <button
                    className={`view-toggle-btn ${viewMode === 'editor' ? 'active' : ''}`}
                    onClick={() => setViewMode('editor')}
                    title="와이어프레임 에디터"
                >
                    <PenTool size={14} />
                    <span>에디터</span>
                </button>
                <button
                    className={`view-toggle-btn ${viewMode === 'figma' ? 'active' : ''}`}
                    onClick={() => setViewMode('figma')}
                    title="Figma 임베드"
                >
                    <Figma size={14} />
                    <span>Figma</span>
                </button>
            </div>

            <form className="figma-url-form" onSubmit={handleSubmit}>
                <input
                    type="url"
                    className="figma-url-input"
                    placeholder="Figma URL 붙여넣기..."
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                />
            </form>

            {figmaUrl && (
                <a
                    href={figmaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="header-action-btn"
                    title="Figma에서 열기"
                >
                    <ExternalLink size={14} />
                </a>
            )}

            <button
                className={`header-action-btn ${exportError ? 'error' : ''}`}
                onClick={handleExport}
                disabled={isExporting}
                title={exportError || 'Figma 디자인 데이터 JSON 내보내기'}
            >
                {isExporting ? (
                    <Loader2 size={14} className="spinner" />
                ) : (
                    <Download size={14} />
                )}
            </button>

            {exportError && (
                <span className="header-error">{exportError}</span>
            )}

            <button
                className={`header-action-btn ${isChatOpen ? 'chat-active' : ''}`}
                onClick={onToggleChat}
                title={isChatOpen ? '채팅 닫기' : '채팅 열기'}
            >
                {isChatOpen ? <MessageCircleOff size={16} /> : <MessageCircle size={16} />}
            </button>

            <button
                className="header-action-btn"
                onClick={() => setShowApiKeyModal(true)}
                title="설정"
            >
                <Settings size={14} />
            </button>
        </div>
    );
}
