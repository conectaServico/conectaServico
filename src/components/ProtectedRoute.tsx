import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useUserStore } from '@/store/userStore';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: ('client' | 'professional')[];
}

const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
  const { isAuthenticated, user } = useUserStore();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
