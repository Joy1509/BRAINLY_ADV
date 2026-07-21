import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'user' | 'admin';
  redirectTo?: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiredRole, 
  redirectTo = '/' 
}) => {
  const { isAuthenticated, user } = useAuth();

  // Check if user is authenticated
  if (!isAuthenticated) {
    return <Navigate to={redirectTo} replace />;
  }

  // Check role requirement if specified
  if (requiredRole && user?.role !== requiredRole) {
    // Redirect admin to admin dashboard, user to user dashboard
    const defaultRedirect = user?.role === 'admin' ? '/admin' : '/home';
    return <Navigate to={defaultRedirect} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;