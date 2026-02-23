import { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Bot, User, X } from 'lucide-react';
import { useChatStore } from '../../store/chatStore';
import type { ChatMessage, ActionResult } from '../../types/sheets';
import { sendDesignChatMessage } from '../../services/aiService';
import SheetContextSummary from './SheetContextSummary';

interface Props {
    onClose: () => void;
}

export default function DesignChatPanel({ onClose }: Props) {
    const {
        designMessages, provider, apiKeys, model, isLoading,
        addDesignMessage, setIsLoading, setShowApiKeyModal,
    } = useChatStore();
    const apiKey = apiKeys[provider];
    const [input, setInput] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [designMessages]);

    const handleSend = async () => {
        const text = input.trim();
        if (!text) return;

        if (!apiKey) {
            setShowApiKeyModal(true);
            return;
        }

        const userMsg: ChatMessage = {
            id: `dmsg-${Date.now()}`,
            role: 'user',
            content: text,
            timestamp: Date.now(),
        };
        addDesignMessage(userMsg);
        setInput('');
        setIsLoading(true);

        try {
            const history = designMessages
                .filter((m) => m.role !== 'system')
                .map((m) => ({
                    role: m.role as 'user' | 'assistant',
                    content: m.content,
                }));

            const { content, actions } = await sendDesignChatMessage(provider, apiKey, model, text, history);

            const assistantMsg: ChatMessage = {
                id: `dmsg-${Date.now() + 1}`,
                role: 'assistant',
                content,
                actions,
                timestamp: Date.now(),
            };
            addDesignMessage(assistantMsg);
        } catch (error: unknown) {
            const errMsg = error instanceof Error ? error.message : 'Unknown error';
            addDesignMessage({
                id: `dmsg-${Date.now() + 2}`,
                role: 'assistant',
                content: `오류: ${errMsg}\n\nAPI 키를 확인하거나 다시 시도해주세요.`,
                timestamp: Date.now(),
            });
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
        return content
            .split('\n')
            .map((line, i) => {
                let formatted = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                if (formatted.startsWith('• ') || formatted.startsWith('- ')) {
                    formatted = `<span class="bullet">•</span> ${formatted.slice(2)}`;
                }
                return <span key={i} dangerouslySetInnerHTML={{ __html: formatted }} />;
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
                    <span key={i} className={`action-badge ${action.type}`}>
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
        <div className="design-chat-panel">
            <div className="design-chat-header">
                <Bot size={18} />
                <span>Design Assistant</span>
                {!apiKey && (
                    <button className="setup-btn" onClick={() => setShowApiKeyModal(true)}>
                        API 키 설정
                    </button>
                )}
                <button className="design-chat-close" onClick={onClose} title="닫기">
                    <X size={16} />
                </button>
            </div>

            <SheetContextSummary />

            <div className="design-chat-messages">
                {designMessages.map((msg) => (
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
                        <div className="message-avatar"><Bot size={16} /></div>
                        <div className="message-body">
                            <div className="message-content loading">
                                <Loader2 size={16} className="spinner" />
                                <span>디자인 분석 중...</span>
                            </div>
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            <div className="design-chat-input-area">
                <textarea
                    className="chat-input"
                    placeholder={apiKey ? '디자인에 대해 물어보세요...' : 'API 키를 먼저 설정해주세요'}
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
