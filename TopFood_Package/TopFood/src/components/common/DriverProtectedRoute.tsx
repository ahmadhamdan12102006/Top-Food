import React, { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useDriverStore } from '../../store/useDriverStore';

interface DriverProtectedRouteProps {
  children: React.ReactNode;
}

// ✅ FIX: Proper driver route guard
const DriverProtectedRoute: React.FC<DriverProtectedRouteProps> = ({ children }) => {
  const { isDriverAuthenticated, checkSession } = useDriverStore();

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  if (!isDriverAuthenticated) {
    return <Navigate to="/driver" replace />;
  }

  return <>{children}</>;
};

export default DriverProtectedRoute;
