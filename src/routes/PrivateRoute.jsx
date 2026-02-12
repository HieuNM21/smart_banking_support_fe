import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

// allowedRoles: Mảng các role được phép vào (VD: ['ADMIN', 'INTERNAL_AGENT'])
const PrivateRoute = ({ children, allowedRoles }) => {
  const { user, login } = useAuth();

  // 1. Nếu chưa đăng nhập -> Chuyển hướng sang trang Login SSO
  if (!user) {
    login(); 
    return null;
  }

  // 2. Nếu đã đăng nhập nhưng sai Role -> Đá về trang 403 hoặc trang Home
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <div style={{ textAlign: 'center', marginTop: 50 }}>Bạn không có quyền truy cập trang này!</div>;
  }

  // 3. Hợp lệ -> Cho hiện nội dung
  return children;
};

export default PrivateRoute;