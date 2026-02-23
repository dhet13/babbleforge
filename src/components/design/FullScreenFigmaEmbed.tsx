import { useState } from 'react';
import { useFigmaStore, buildEmbedUrl } from '../../store/figmaStore';

export default function FullScreenFigmaEmbed() {
    const { figmaUrl } = useFigmaStore();
    const embedUrl = buildEmbedUrl(figmaUrl);
    const [isLoading, setIsLoading] = useState(!!embedUrl);

    if (!embedUrl) {
        return (
            <div className="design-figma-empty">
                <svg width="64" height="64" viewBox="0 0 48 48" fill="none" opacity="0.3">
                    <rect x="8" y="4" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="2" />
                    <rect x="8" y="18" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="2" />
                    <rect x="8" y="32" width="14" height="14" rx="7" stroke="currentColor" strokeWidth="2" />
                    <rect x="22" y="4" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="2" />
                    <circle cx="29" cy="25" r="7" stroke="currentColor" strokeWidth="2" />
                </svg>
                <p>Figma URL을 상단에 입력하세요</p>
                <span>디자인 파일을 전체 화면으로 볼 수 있습니다</span>
            </div>
        );
    }

    return (
        <div className="design-figma-container">
            {isLoading && (
                <div className="design-figma-loading">Figma 로딩 중...</div>
            )}
            <iframe
                src={embedUrl}
                className="design-figma-iframe"
                allowFullScreen
                onLoad={() => setIsLoading(false)}
                style={{ opacity: isLoading ? 0 : 1 }}
            />
        </div>
    );
}
