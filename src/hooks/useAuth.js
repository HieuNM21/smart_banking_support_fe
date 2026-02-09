// src/hooks/useAuth.js
import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext'; // Import từ file Context

// Tạo custom hook ở đây
export const useAuth = () => {
  return useContext(AuthContext);
};