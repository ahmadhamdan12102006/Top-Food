import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading, setAuthModalOpen } = useAuthStore();
  const location = useLocation();

  useEffect(() => {
    // If not authenticated, automatically trigger the UI layer Modal Hook over whatever page they are on!
    if (!isLoading && !isAuthenticated) {
      setAuthModalOpen(true);
    }
  }, [isLoading, isAuthenticated, setAuthModalOpen]);

  if (isLoading) {
    return <div className="min-h-[50vh] flex items-center justify-center">جاري التحميل...</div>;
  }

  // Redirect to homepage rather than locking state if completely unauthorized so DOM matches URL.
  if (!isAuthenticated) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
