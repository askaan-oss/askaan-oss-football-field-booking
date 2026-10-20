import axios from 'axios';

const axiosClient = axios.create({
  baseURL: 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Tự động gắn Token vào Header nếu đã đăng nhập
axiosClient.interceptors.request.use((config) => {
  let token = null;

  // Nếu là các API dành riêng cho khách hàng thì ưu tiên dùng customer_token
  const isCustomerEndpoint = config.url && (
    config.url.includes('/customer') ||
    config.url.includes('/bookings/my') ||
    config.url.includes('/bookings/online') ||
    config.url.includes('/cancel')
  );

  if (isCustomerEndpoint) {
    token = localStorage.getItem('customer_token') || localStorage.getItem('token');
  } else {
    token = localStorage.getItem('token') || localStorage.getItem('customer_token');
  }

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

export default axiosClient;