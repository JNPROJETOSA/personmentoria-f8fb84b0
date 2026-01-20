
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
    allowedRoles?: ('admin' | 'student' | 'mentor')[];
}

export const ProtectedRoute = ({ allowedRoles }: ProtectedRouteProps) => {
    const { session, profile, loading } = useAuth();

    if (loading) {
        return (
            <div className="h-screen w-full flex items-center justify-center bg-background">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!session) {
        return <Navigate to="/login" replace />;
    }

    // If roles are specified, check if user has permission
    if (allowedRoles && profile && !allowedRoles.includes(profile.role as 'admin' | 'student' | 'mentor')) {
        // Redirect students trying to access admin routes back to dashboard
        return <Navigate to="/" replace />;
    }

    return <Outlet />;
};
