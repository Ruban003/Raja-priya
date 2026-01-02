import axios from 'axios';

// Connect to your existing Backend
const api = axios.create({
  baseURL: 'http://localhost:5001/api', 
});

export default api;