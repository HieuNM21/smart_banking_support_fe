import React from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { Layout, Menu } from 'antd';
import CustomerPortal from './pages/CustomerPortal';
import AgentDashboard from './pages/AgentDashboard';

const { Header, Content } = Layout;

function App() {
  return (
    <BrowserRouter>
      {/* KHÔNG CÒN LAYOUT HAY HEADER CHUNG Ở ĐÂY NỮA */}
      <Routes>
        {/* Route dành cho Khách hàng (Giao diện clean, sáng) */}
        <Route path="/" element={<CustomerPortal />} />

        {/* Route dành cho Agent (Giao diện Dashboard, tối hoặc nhiều dữ liệu) */}
        <Route path="/admin" element={<AgentDashboard />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;