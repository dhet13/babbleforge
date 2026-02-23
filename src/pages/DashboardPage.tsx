import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, Key, LogOut } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { api } from '../services/apiClient';
import type { Project, Sheet, McpToken } from '../types/api';

interface ProjectWithSheets extends Project {
    sheets: Sheet[];
}

export default function DashboardPage() {
    const { user, logout } = useAuthStore();
    const navigate = useNavigate();
    const [projects, setProjects] = useState<ProjectWithSheets[]>([]);
    const [tokens, setTokens] = useState<McpToken[]>([]);
    const [showTokens, setShowTokens] = useState(false);

    useEffect(() => {
        loadProjects();
    }, []);

    async function loadProjects() {
        const projectList = await api.getProjects();
        // 각 프로젝트의 시트 정보 가져오기
        const withSheets = await Promise.all(
            projectList.map(async (p) => {
                const detail = await api.getProject(p.id);
                return detail;
            }),
        );
        setProjects(withSheets);
    }

    async function handleCreateProject() {
        const name = prompt('프로젝트 이름을 입력하세요');
        if (!name) return;

        const result = await api.createProject(name);
        navigate(
            `/projects/${result.id}/sheets/${result.defaultSheetId}`,
        );
    }

    async function handleDeleteProject(pid: string) {
        if (!confirm('정말 삭제하시겠습니까?')) return;
        await api.deleteProject(pid);
        setProjects((prev) => prev.filter((p) => p.id !== pid));
    }

    async function loadTokens() {
        const tokenList = await api.getTokens();
        setTokens(tokenList);
        setShowTokens(true);
    }

    async function handleCreateToken(projectId: string, projectName: string) {
        const name = prompt(`"${projectName}" 토큰 이름을 입력하세요`);
        if (!name) return;

        const token = await api.createToken(name, projectId);
        setTokens((prev) => [...prev, token]);
        alert(`토큰이 생성되었습니다:\n\n${token.token}\n\n이 토큰을 MCP 클라이언트 설정에 사용하세요.`);
    }

    async function handleDeleteToken(tokenId: string) {
        await api.deleteToken(tokenId);
        setTokens((prev) => prev.filter((t) => t.id !== tokenId));
    }

    return (
        <div className="dashboard-page">
            <header className="dashboard-header">
                <h1>
                    <span className="accent">Sindri</span> Sheet
                </h1>
                <div className="dashboard-header-right">
                    <span className="user-name">{user?.name}</span>
                    <button className="btn-icon" onClick={loadTokens} title="MCP 토큰 관리">
                        <Key size={16} />
                    </button>
                    <button className="btn-icon" onClick={logout} title="로그아웃">
                        <LogOut size={16} />
                    </button>
                </div>
            </header>

            <main className="dashboard-content">
                <div className="dashboard-section">
                    <div className="section-header">
                        <h2>내 프로젝트</h2>
                        <button className="btn-primary" onClick={handleCreateProject}>
                            <Plus size={16} />
                            새 프로젝트
                        </button>
                    </div>

                    {projects.length === 0 ? (
                        <div className="empty-state">
                            <p>프로젝트가 없습니다. 새 프로젝트를 만들어보세요.</p>
                        </div>
                    ) : (
                        <div className="project-grid">
                            {projects.map((project) => (
                                <div key={project.id} className="project-card">
                                    <div
                                        className="project-card-body"
                                        onClick={() => {
                                            const sheet = project.sheets[0];
                                            if (sheet) {
                                                navigate(
                                                    `/projects/${project.id}/sheets/${sheet.id}`,
                                                );
                                            }
                                        }}
                                    >
                                        <h3>{project.name}</h3>
                                        {project.description && (
                                            <p className="project-desc">
                                                {project.description}
                                            </p>
                                        )}
                                        <span className="project-meta">
                                            {new Date(project.updatedAt).toLocaleDateString('ko-KR')}
                                        </span>
                                    </div>
                                    <div className="project-card-actions">
                                        <button
                                            className="btn-icon"
                                            onClick={() =>
                                                handleCreateToken(project.id, project.name)
                                            }
                                            title="MCP 토큰 생성"
                                        >
                                            <Key size={14} />
                                        </button>
                                        <button
                                            className="btn-icon delete"
                                            onClick={() => handleDeleteProject(project.id)}
                                            title="프로젝트 삭제"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {showTokens && (
                    <div className="dashboard-section">
                        <div className="section-header">
                            <h2>MCP 토큰</h2>
                            <button
                                className="btn-secondary"
                                onClick={() => setShowTokens(false)}
                            >
                                닫기
                            </button>
                        </div>
                        {tokens.length === 0 ? (
                            <p className="empty-state">생성된 토큰이 없습니다.</p>
                        ) : (
                            <div className="token-list">
                                {tokens.map((token) => (
                                    <div key={token.id} className="token-item">
                                        <div>
                                            <strong>{token.name}</strong>
                                            <code>{token.token}</code>
                                        </div>
                                        <button
                                            className="btn-icon delete"
                                            onClick={() => handleDeleteToken(token.id)}
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}
