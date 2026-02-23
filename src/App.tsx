import { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import LandingPage from './pages/LandingPage';
import DashboardPage from './pages/DashboardPage';
import SheetPage from './pages/SheetPage';
import DesignModePage from './pages/DesignModePage';
import ProtectedRoute from './components/ProtectedRoute';
import './App.css';

function App() {
    const fetchUser = useAuthStore((s) => s.fetchUser);

    useEffect(() => {
        fetchUser();
    }, [fetchUser]);

    return (
        <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route
                path="/dashboard"
                element={
                    <ProtectedRoute>
                        <DashboardPage />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/projects/:projectId/sheets/:sheetId"
                element={
                    <ProtectedRoute>
                        <SheetPage />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/projects/:projectId/sheets/:sheetId/design"
                element={
                    <ProtectedRoute>
                        <DesignModePage />
                    </ProtectedRoute>
                }
            />
        </Routes>
    );
}

export default App;
