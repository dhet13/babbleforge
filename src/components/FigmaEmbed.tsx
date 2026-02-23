import { useState } from 'react';
import { X, ExternalLink, Link } from 'lucide-react';
import { useFigmaStore, buildEmbedUrl } from '../store/figmaStore';

export default function FigmaEmbed() {
    const { figmaUrl, isEmbedVisible, setFigmaUrl, setEmbedVisible } = useFigmaStore();
    const [inputValue, setInputValue] = useState(figmaUrl);
    const [isLoading, setIsLoading] = useState(false);

    if (!isEmbedVisible) return null;

    const embedUrl = buildEmbedUrl(figmaUrl);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setFigmaUrl(inputValue.trim());
        if (inputValue.trim()) setIsLoading(true);
    };

    const handleIframeLoad = () => {
        setIsLoading(false);
    };

    return (
        <div className="figma-embed-panel">
            <div className="figma-embed-header">
                <Link size={14} className="figma-embed-icon" />
                <form className="figma-embed-form" onSubmit={handleSubmit}>
                    <input
                        type="url"
                        className="figma-embed-input"
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
                        className="figma-embed-external"
                        title="Figma에서 열기"
                    >
                        <ExternalLink size={14} />
                    </a>
                )}
                <button
                    className="figma-embed-close"
                    onClick={() => setEmbedVisible(false)}
                    title="닫기"
                >
                    <X size={14} />
                </button>
            </div>

            <div className="figma-embed-body">
                {embedUrl ? (
                    <>
                        {isLoading && (
                            <div className="figma-embed-loading">
                                Figma 로딩 중...
                            </div>
                        )}
                        <iframe
                            src={embedUrl}
                            className="figma-embed-iframe"
                            allowFullScreen
                            onLoad={handleIframeLoad}
                            style={{ opacity: isLoading ? 0 : 1 }}
                        />
                    </>
                ) : (
                    <div className="figma-embed-empty">
                        <div className="figma-embed-empty-icon">
                            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                                <rect x="8" y="4" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="2" />
                                <rect x="8" y="18" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="2" />
                                <rect x="8" y="32" width="14" height="14" rx="7" stroke="currentColor" strokeWidth="2" />
                                <rect x="22" y="4" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="2" />
                                <circle cx="29" cy="25" r="7" stroke="currentColor" strokeWidth="2" />
                            </svg>
                        </div>
                        <p>Figma 파일 URL을 입력하세요</p>
                        <span>디자인을 Sheet 옆에서 확인할 수 있습니다</span>
                    </div>
                )}
            </div>
        </div>
    );
}
