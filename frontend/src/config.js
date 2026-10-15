// Central API configuration
// In production, set VITE_API_URL environment variable to your Render backend URL
// Example: https://datamart-backend.onrender.com
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001';

export default API_BASE_URL;
