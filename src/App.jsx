import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthProvider';
import PrivateRoute from './routes/PrivateRoute';
import CustomerPortal from './pages/CustomerPortal';
import AgentDashboard from './pages/AgentDashboard';

function App() {
  return (
    // 1. Bọc toàn bộ App trong AuthProvider
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          
          {/* --- ROUTE CÔNG KHAI (Ai cũng vào được) --- */}
          {/* Ví dụ: Trang giới thiệu, trang lỗi */}
          
          {/* --- ROUTE DÀNH CHO KHÁCH HÀNG --- */}
          <Route 
            path="/portal/home" 
            element={
              <PrivateRoute allowedRoles={['CUSTOMER', 'ADMIN']}>
                <CustomerPortal />
              </PrivateRoute>
            } 
          />
          {/* Mặc định vào portal */}
          <Route path="/" element={<CustomerPortal />} /> 

          {/* --- ROUTE DÀNH CHO AGENT/ADMIN --- */}
          <Route 
            path="/agent/workspace" 
            element={
              <PrivateRoute allowedRoles={['INTERNAL_AGENT', 'ADMIN']}>
                <AgentDashboard />
              </PrivateRoute>
            } 
          />

        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;