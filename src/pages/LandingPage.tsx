import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useEffect } from 'react';

export default function LandingPage() {
    const { isAuthenticated, isLoading } = useAuthStore();
    const navigate = useNavigate();

    useEffect(() => {
        if (!isLoading && isAuthenticated) {
            navigate('/dashboard');
        }
    }, [isAuthenticated, isLoading, navigate]);

    return (
        <div className="landing-page">
            <div className="landing-hero">
                <h1 className="landing-title">
                    <span className="accent">Sindri</span> Sheet
                </h1>
                <p className="landing-subtitle">
                    AI 기반 소프트웨어 기획 스프레드시트
                </p>
                <p className="landing-description">
                    비개발자도 채팅만으로 MVP 모델을 설계할 수 있는 AI 기반 개발 플랫폼.
                    MCP 클라이언트와 웹, 크롬 확장앱에서 동시에 작업하세요.
                </p>
                <div className="landing-actions">
                    <a href="/auth/google" className="btn-primary">
                        Google로 시작하기
                    </a>
                    <a href="/auth/github" className="btn-secondary">
                        GitHub로 시작하기
                    </a>
                </div>
            </div>

            <div className="landing-features">
                <div className="feature-card">
                    <span className="feature-icon">📋</span>
                    <h3>7가지 기획 시트</h3>
                    <p>메타, 규칙, 데이터 모델, 기능, 디자인, 스크린, 에러 사전</p>
                </div>
                <div className="feature-card">
                    <span className="feature-icon">🤖</span>
                    <h3>MCP 연동</h3>
                    <p>Claude, Cursor 등 AI 도구에서 직접 시트를 수정</p>
                </div>
                <div className="feature-card">
                    <span className="feature-icon">⚡</span>
                    <h3>실시간 동기화</h3>
                    <p>웹, 확장앱, MCP 클라이언트 간 실시간 데이터 동기화</p>
                </div>
            </div>
        </div>
    );
}
