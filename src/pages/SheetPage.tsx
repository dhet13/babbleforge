import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import Header from '../components/Header';
import SheetViewer from '../components/SheetViewer';
import ChatPanel from '../components/ChatPanel';
import { useSheetStore } from '../store/sheetStore';
import { useSheetSync } from '../hooks/useSheetSync';

export default function SheetPage() {
    const { sheetId } = useParams<{ projectId: string; sheetId: string }>();
    const loadSheet = useSheetStore((s) => s.loadSheet);
    const isLoading = useSheetStore((s) => s.isLoading);
    const error = useSheetStore((s) => s.error);

    useEffect(() => {
        if (sheetId) {
            loadSheet(sheetId);
        }
    }, [sheetId, loadSheet]);

    // WebSocket 실시간 동기화
    useSheetSync(sheetId);

    if (isLoading) {
        return (
            <div className="app">
                <div className="loading-state">데이터 로딩 중...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="app">
                <div className="error-state">오류: {error}</div>
            </div>
        );
    }

    return (
        <div className="app">
            <Header />
            <main className="app-main">
                <SheetViewer />
                <ChatPanel />
            </main>
        </div>
    );
}
