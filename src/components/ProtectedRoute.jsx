import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Route guard - redirects to /login when unauthenticated and
 * renders an access-denied page when the role is not allowed.
 */
export default function ProtectedRoute({ children, roles }) {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" />
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  if (roles && !roles.includes(user.role)) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 p-6 text-center">
        <div className="text-5xl">🔒</div>
        <h1 className="text-xl font-semibold text-slate-800">Access Denied</h1>
        <p className="max-w-md text-sm text-slate-500">
          Your account role ({user.role}) does not have permission to view this page.
        </p>
      </div>
    );
  }

  return children;
}
