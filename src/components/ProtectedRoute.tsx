import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

interface Props {
    children: React.ReactNode;
}

export default function ProtectedRoute({ children }: Props) {
    const { isAuthenticated, isLoading } = useAuthStore();

    if (isLoading) {
        return <div className="loading-state">로딩 중...</div>;
    }

    if (!isAuthenticated) {
        return <Navigate to="/" replace />;
    }

    return <>{children}</>;
}
