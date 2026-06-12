import axios from 'axios'
import { message } from 'antd'

const request = axios.create({
  baseURL: '/api',
  timeout: 30000
})

request.interceptors.request.use(
  config => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  error => Promise.reject(error)
)

request.interceptors.response.use(
  response => {
    const res = response.data
    if (res.code === 200) {
      return res
    }
    message.error(res.message || '请求失败')
    return Promise.reject(res)
  },
  error => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
      message.error('登录已过期，请重新登录')
    } else {
      message.error(error.response?.data?.message || error.message || '网络错误')
    }
    return Promise.reject(error)
  }
)

export const authAPI = {
  login: (data) => request.post('/auth/login', data),
  register: (data) => request.post('/auth/register', data),
  logout: () => request.post('/auth/logout'),
  getProfile: () => request.get('/auth/profile')
}

export const userAPI = {
  getUsers: (params) => request.get('/users', { params }),
  getUserDetail: (id) => request.get(`/users/${id}`),
  createUser: (data) => request.post('/users', data),
  updateUser: (id, data) => request.put(`/users/${id}`, data),
  updateProfile: (data) => request.put('/users/profile', data),
  getAdapters: (params) => request.get('/users/adapters', { params }),
  getTherapists: (params) => request.get('/users/therapists', { params })
}

export const deviceAPI = {
  getDevices: (params) => request.get('/devices', { params }),
  getDeviceDetail: (id) => request.get(`/devices/${id}`),
  createDevice: (data) => request.post('/devices', data),
  updateDevice: (id, data) => request.put(`/devices/${id}`, data),
  deleteDevice: (id) => request.delete(`/devices/${id}`),
  getCategories: () => request.get('/devices/categories/list')
}

export const assessmentAPI = {
  createAssessment: (data) => request.post('/assessments', data),
  getAssessments: (params) => request.get('/assessments', { params }),
  getAssessmentDetail: (id) => request.get(`/assessments/${id}`),
  updateAssessment: (id, data) => request.put(`/assessments/${id}`, data),
  homeAssessment: (id, data) => request.post(`/assessments/${id}/home-assessment`, data),
  getRecommendation: (id) => request.get(`/assessments/${id}/recommendation`)
}

export const planAPI = {
  createPlan: (data) => request.post('/plans', data),
  getPlans: (params) => request.get('/plans', { params }),
  getPlanDetail: (id) => request.get(`/plans/${id}`),
  updatePlan: (id, data) => request.put(`/plans/${id}`, data),
  updatePlanStatus: (id, data) => request.put(`/plans/${id}/status`, data),
  generateOrder: (id, data) => request.post(`/plans/${id}/generate-order`, data)
}

export const orderAPI = {
  getOrders: (params) => request.get('/orders', { params }),
  getOrderDetail: (id) => request.get(`/orders/${id}`),
  updateOrderStatus: (id, data) => request.put(`/orders/${id}/status`, data),
  payOrder: (id, data) => request.put(`/orders/${id}/pay`, data),
  getOrderItems: (id) => request.get(`/orders/${id}/items`),
  getStatistics: () => request.get('/orders/statistics/summary')
}

export const trainingAPI = {
  createPlan: (data) => request.post('/training/plans', data),
  getPlans: (params) => request.get('/training/plans', { params }),
  getPlanDetail: (id) => request.get(`/training/plans/${id}`),
  updatePlan: (id, data) => request.put(`/training/plans/${id}`, data),
  updatePlanStatus: (id, data) => request.put(`/training/plans/${id}/status`, data),
  createRecord: (data) => request.post('/training/records', data),
  getRecords: (params) => request.get('/training/records', { params }),
  getRecordDetail: (id) => request.get(`/training/records/${id}`),
  getPlanRecords: (planId) => request.get(`/training/plans/${planId}/records`),
  getPlanProgress: (planId) => request.get(`/training/plans/${planId}/progress`)
}

export const appointmentAPI = {
  getAvailable: (params) => request.get('/appointments/available', { params }),
  create: (data) => request.post('/appointments', data),
  getList: (params) => request.get('/appointments', { params }),
  getDetail: (id) => request.get(`/appointments/${id}`),
  updateStatus: (id, data) => request.put(`/appointments/${id}/status`, data),
  reschedule: (id, data) => request.put(`/appointments/${id}/reschedule`, data),
  getTherapistSlots: (therapistId, params) => request.get(`/appointments/therapist/${therapistId}/slots`, { params })
}

export const financeAPI = {
  getRecords: (params) => request.get('/finance/records', { params }),
  getRecordDetail: (id) => request.get(`/finance/records/${id}`),
  addRecord: (data) => request.post('/finance/records', data),
  getSummary: () => request.get('/finance/summary'),
  getStatistics: (params) => request.get('/finance/statistics', { params })
}

export const notificationAPI = {
  getList: (params) => request.get('/notifications', { params }),
  getUnreadCount: () => request.get('/notifications/unread-count'),
  markAsRead: (id) => request.put(`/notifications/${id}/read`),
  markAllRead: () => request.put('/notifications/read-all'),
  deleteNotification: (id) => request.delete(`/notifications/${id}`)
}

export const reportAPI = {
  getMonthlyReports: (params) => request.get('/reports/monthly', { params }),
  getMonthlyReport: (month) => request.get(`/reports/monthly/${month}`),
  generateMonthly: (data) => request.post('/reports/monthly/generate', data),
  getDashboard: () => request.get('/reports/dashboard')
}

export default request
