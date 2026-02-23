import { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Bot, User } from 'lucide-react';
import { useChatStore } from '../store/chatStore';
import type { ChatMessage, ActionResult } from '../types/sheets';
import { sendChatMessage } from '../services/aiService';

export default function ChatPanel() {
    const { messages, apiKey, isLoading, addMessage, setIsLoading, setShowApiKeyModal } =
        useChatStore();
    const [input, setInput] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = async () => {
        const text = input.trim();
        if (!text) return;

        if (!apiKey) {
            setShowApiKeyModal(true);
            return;
        }

        const userMsg: ChatMessage = {
            id: `msg-${Date.now()}`,
            role: 'user',
            content: text,
            timestamp: Date.now(),
        };
        addMessage(userMsg);
        setInput('');
        setIsLoading(true);

        try {
            const history = messages
                .filter((m) => m.role !== 'system')
                .map((m) => ({
                    role: m.role as 'user' | 'assistant',
                    content: m.content,
                }));

            const { content, actions } = await sendChatMessage(apiKey, text, history);

            const assistantMsg: ChatMessage = {
                id: `msg-${Date.now() + 1}`,
                role: 'assistant',
                content,
                actions,
                timestamp: Date.now(),
            };
            addMessage(assistantMsg);
        } catch (error: unknown) {
            const errMsg =
                error instanceof Error ? error.message : 'Unknown error';
            const errorMsg: ChatMessage = {
                id: `msg-${Date.now() + 2}`,
                role: 'assistant',
                content: `⚠️ 오류가 발생했습니다: ${errMsg}\n\nAPI 키를 확인하거나 다시 시도해주세요.`,
                timestamp: Date.now(),
            };
            addMessage(errorMsg);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const formatContent = (content: string) => {
        // Simple markdown-like formatting
        return content
            .split('\n')
            .map((line, i) => {
                // Bold
                let formatted = line.replace(
                    /\*\*(.*?)\*\*/g,
                    '<strong>$1</strong>'
                );
                // Bullet points
                if (formatted.startsWith('• ') || formatted.startsWith('- ')) {
                    formatted = `<span class="bullet">•</span> ${formatted.slice(2)}`;
                }
                return (
                    <span key={i} dangerouslySetInnerHTML={{ __html: formatted }} />
                );
            })
            .reduce((acc: React.ReactNode[], curr, i) => {
                if (i > 0) acc.push(<br key={`br-${i}`} />);
                acc.push(curr);
                return acc;
            }, []);
    };

    const renderActions = (actions: ActionResult[]) => {
        if (!actions || actions.length === 0) return null;
        return (
            <div className="action-badges">
                {actions.map((action, i) => (
                    <span
                        key={i}
                        className={`action-badge ${action.type}`}
                    >
                        {action.type === 'add' && '➕'}
                        {action.type === 'update' && '✏️'}
                        {action.type === 'delete' && '🗑️'}
                        {' '}{action.summary}
                    </span>
                ))}
            </div>
        );
    };

    return (
        <div className="chat-panel">
            <div className="chat-header">
                <Bot size={20} />
                <span>AI 어시스턴트</span>
                {!apiKey && (
                    <button
                        className="setup-btn"
                        onClick={() => setShowApiKeyModal(true)}
                    >
                        API 키 설정
                    </button>
                )}
            </div>

            <div className="chat-messages">
                {messages.map((msg) => (
                    <div key={msg.id} className={`chat-message ${msg.role}`}>
                        <div className="message-avatar">
                            {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                        </div>
                        <div className="message-body">
                            <div className="message-content">
                                {formatContent(msg.content)}
                            </div>
                            {msg.actions && renderActions(msg.actions)}
                        </div>
                    </div>
                ))}

                {isLoading && (
                    <div className="chat-message assistant">
                        <div className="message-avatar">
                            <Bot size={16} />
                        </div>
                        <div className="message-body">
                            <div className="message-content loading">
                                <Loader2 size={16} className="spinner" />
                                <span>생각 중...</span>
                            </div>
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            <div className="chat-input-area">
                <textarea
                    ref={inputRef}
                    className="chat-input"
                    placeholder={
                        apiKey
                            ? '메시지를 입력하세요... (Shift+Enter: 줄바꿈)'
                            : '먼저 API 키를 설정해주세요'
                    }
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    rows={1}
                    disabled={isLoading}
                />
                <button
                    className="send-btn"
                    onClick={handleSend}
                    disabled={!input.trim() || isLoading}
                >
                    {isLoading ? <Loader2 size={18} className="spinner" /> : <Send size={18} />}
                </button>
            </div>
        </div>
    );
}
