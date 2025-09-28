import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const AI_SERVICE_URL = process.env.REACT_APP_AI_SERVICE_URL || 'http://localhost:8000/api/ai';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle response errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (userData) => api.post('/auth/register', userData),
  getProfile: () => api.get('/auth/me'),
  refreshToken: () => api.post('/auth/refresh'),
  logout: () => api.post('/auth/logout'),
};

// Users API
export const usersAPI = {
  getUsers: (params) => api.get('/users', { params }),
  getUser: (id) => api.get(`/users/${id}`),
  updateUser: (id, data) => api.put(`/users/${id}`, data),
  deactivateUser: (id) => api.patch(`/users/${id}/deactivate`),
  activateUser: (id) => api.patch(`/users/${id}/activate`),
  getUserStats: () => api.get('/users/stats'),
};

// Profiles API
export const profilesAPI = {
  getProfiles: (params) => api.get('/profiles', { params }),
  getProfile: (id) => api.get(`/profiles/${id}`),
  createProfile: (data) => api.post('/profiles', data),
  updateProfile: (id, data) => api.put(`/profiles/${id}`, data),
  uploadResume: (file) => {
    const formData = new FormData();
    formData.append('resume', file);
    return api.post('/profiles/upload-resume', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  getRecommendations: (id) => api.get(`/profiles/${id}/recommendations`),
};

// Jobs API
export const jobsAPI = {
  getJobs: (params) => api.get('/jobs', { params }),
  getJob: (id) => api.get(`/jobs/${id}`),
  createJob: (data) => api.post('/jobs', data),
  updateJob: (id, data) => api.put(`/jobs/${id}`, data),
  publishJob: (id) => api.patch(`/jobs/${id}/publish`),
  applyToJob: (id, data) => api.post(`/jobs/${id}/apply`, data),
};

// Applications API
export const applicationsAPI = {
  getApplications: (params) => api.get('/applications', { params }),
  getApplication: (id) => api.get(`/applications/${id}`),
  updateApplicationStatus: (id, data) => api.patch(`/applications/${id}/status`, data),
  mentorApproval: (id, data) => api.patch(`/applications/${id}/mentor-approval`, data),
  scheduleInterview: (id, data) => api.post(`/applications/${id}/schedule-interview`, data),
  getApplicationTimeline: (id) => api.get(`/applications/${id}/timeline`),
};

// Certificates API
export const certificatesAPI = {
  getCertificates: (params) => api.get('/certificates', { params }),
  getCertificate: (id) => api.get(`/certificates/${id}`),
  generateCertificate: (data) => api.post('/certificates/generate', data),
  verifyCertificate: (code) => api.get(`/certificates/verify/${code}`),
  downloadCertificate: (id) => api.get(`/certificates/${id}/download`),
  revokeCertificate: (id) => api.patch(`/certificates/${id}/revoke`),
};

// AI API
export const aiAPI = {
  chat: (data) => api.post('/ai/chat', data),
  generateEmbeddings: (data) => api.post('/ai/embeddings', data),
  getRecommendations: (studentId) => api.get(`/ai/recommendations/${studentId}`),
  parseResume: (data) => api.post('/ai/resume-parse', data),
  findSimilarJobs: (data) => api.post('/ai/similar-jobs', data),
  analyzeApplication: (data) => api.post('/ai/analyze-application', data),
};

// AI Service API (direct calls to Python service)
const aiService = axios.create({
  baseURL: AI_SERVICE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const aiServiceAPI = {
  chat: (data) => aiService.post('/chat', data),
  generateEmbeddings: (data) => aiService.post('/embeddings', data),
  getRecommendations: (studentId) => aiService.get(`/recommendations/${studentId}`),
  parseResume: (data) => aiService.post('/resume-parse', data),
  findSimilarJobs: (data) => aiService.post('/similar-jobs', data),
  generateCertificate: (data) => aiService.post('/generate-certificate', data),
};

export default api;

