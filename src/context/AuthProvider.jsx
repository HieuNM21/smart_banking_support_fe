import React, { useState, useEffect } from 'react';
import { AuthContext } from './AuthContext'; // <--- Import từ file trên
import axiosClient from '../api/axiosClient';
import { Spin } from 'antd';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkLogin = async () => {
      try {
        const data = await axiosClient.get('/api/auth/me');
        setUser(data);
        const redirectUrl = localStorage.getItem('redirectUrl');
        if (redirectUrl) {
           localStorage.removeItem('redirectUrl'); 
           window.location.href = redirectUrl; 
        }
      } catch (error) {
        console.log(error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    checkLogin();
  }, []);

  const login = () => {
    localStorage.setItem('redirectUrl', window.location.pathname);
    window.location.href = '/api/auth/login';
  };

  if (loading) return <Spin />;

  return (
    <AuthContext.Provider value={{ user, login, loading }}>
      {children}
    </AuthContext.Provider>
  );
};