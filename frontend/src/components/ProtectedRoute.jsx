import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div>Loading...</div>; // Could use Loader component here
  }

  if (!user) {
    // Not logged in, redirect to login page with the return url
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Role not authorized, redirect to appropriate dashboard or home
    const redirectPath = user.role === 'ADMIN' ? '/admin' : '/student';
    return <Navigate to={redirectPath} replace />;
  }

  return children;
};
