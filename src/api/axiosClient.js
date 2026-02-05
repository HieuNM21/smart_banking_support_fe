import axios from 'axios';

const axiosClient = axios.create({
  baseURL: 'http://10.2.22.54:8080',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor xử lý response
axiosClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export default axiosClient;