import { useEffect, useRef, useCallback } from 'react';
import { useSheetStore } from '../store/sheetStore';
import { useAuthStore } from '../store/authStore';
import type { WsEvent } from '../types/ws';

export function useSheetSync(sheetId: string | undefined) {
    const wsRef = useRef<WebSocket | null>(null);
    const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const reconnectAttempts = useRef(0);
    const applyWsMessage = useSheetStore((s) => s.applyWsMessage);
    const userId = useAuthStore((s) => s.user?.id);

    const connect = useCallback(() => {
        if (!sheetId) return;

        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws?sheetId=${sheetId}`;

        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
            reconnectAttempts.current = 0;
        };

        ws.onmessage = (event) => {
            const msg: WsEvent = JSON.parse(event.data);

            // 자기 자신의 변경은 이미 낙관적으로 적용됨 → 무시
            if ('userId' in msg && msg.userId === userId) return;

            applyWsMessage(msg);
        };

        ws.onclose = () => {
            wsRef.current = null;
            // Exponential backoff 재연결
            const delay = Math.min(1000 * 2 ** reconnectAttempts.current, 30000);
            reconnectAttempts.current++;
            reconnectTimerRef.current = setTimeout(connect, delay);
        };

        ws.onerror = () => {
            ws.close();
        };
    }, [sheetId, userId, applyWsMessage]);

    useEffect(() => {
        connect();

        return () => {
            clearTimeout(reconnectTimerRef.current);
            wsRef.current?.close();
            wsRef.current = null;
        };
    }, [connect]);
}
