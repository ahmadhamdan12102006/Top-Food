import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAdminStore } from '../../store/useAdminStore';
import { useAuthStore } from '../../store/useAuthStore';

interface AdminProtectedRouteProps {
  children: React.ReactNode;
}

const isAdminRole = (role?: string | null) =>
  String(role || '').trim().toLowerCase() === 'admin';

// ✅ FIX: Proper admin route guard - checks both session + role
const AdminProtectedRoute: React.FC<AdminProtectedRouteProps> = ({ children }) => {
  const { isAdminAuthenticated, checkSession } = useAdminStore();
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuthStore();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let mounted = true;
    checkSession().finally(() => {
      if (mounted) setChecking(false);
    });
    return () => { mounted = false; };
  }, [checkSession]);

  if (checking || isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#09090B] text-white" dir="rtl">
        <div className="text-center">
          <div className="text-4xl mb-4">🔐</div>
          <p className="text-lg font-bold opacity-70">جاري التحقق من الصلاحية...</p>
        </div>
      </div>
    );
  }

  const hasAdminRole = isAuthenticated && isAdminRole(user?.role);

  if (!isAdminAuthenticated || !hasAdminRole) {
    return <Navigate to="/admin" replace />;
  }

  return <>{children}</>;
};

export default AdminProtectedRoute;
