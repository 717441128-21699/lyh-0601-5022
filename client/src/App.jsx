import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Notifications from './pages/Notifications'
import Profile from './pages/Profile'
import NotFound from './pages/NotFound'
import MainLayout from './components/layout/MainLayout'
import useUserStore from './store/useUserStore'

import AssessmentList from './pages/assessment/AssessmentList'
import AssessmentDetail from './pages/assessment/AssessmentDetail'
import AssessmentForm from './pages/assessment/AssessmentForm'

import PlanList from './pages/plan/PlanList'
import PlanDetail from './pages/plan/PlanDetail'
import PlanForm from './pages/plan/PlanForm'

import OrderList from './pages/order/OrderList'
import OrderDetail from './pages/order/OrderDetail'
import OrderStatistics from './pages/order/OrderStatistics'

import TrainingPlanList from './pages/training/TrainingPlanList'
import TrainingPlanDetail from './pages/training/TrainingPlanDetail'
import TrainingPlanForm from './pages/training/TrainingPlanForm'
import TrainingRecordForm from './pages/training/TrainingRecordForm'
import TrainingRecordDetail from './pages/training/TrainingRecordDetail'

import AppointmentList from './pages/appointment/AppointmentList'
import AppointmentDetail from './pages/appointment/AppointmentDetail'
import AppointmentForm from './pages/appointment/AppointmentForm'
import AppointmentCalendar from './pages/appointment/AppointmentCalendar'

import FinanceRecords from './pages/finance/FinanceRecords'
import FinanceStatistics from './pages/finance/FinanceStatistics'

import MonthlyReportList from './pages/report/MonthlyReportList'
import MonthlyReportDetail from './pages/report/MonthlyReportDetail'

import DeviceList from './pages/device/DeviceList'
import DeviceDetail from './pages/device/DeviceDetail'
import DeviceForm from './pages/device/DeviceForm'

import UserList from './pages/user/UserList'
import UserDetail from './pages/user/UserDetail'
import UserForm from './pages/user/UserForm'

const ProtectedRoute = ({ children }) => {
  const token = useUserStore(state => state.token)
  return token ? children : <Navigate to="/login" replace />
}

const App = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={
        <ProtectedRoute>
          <MainLayout />
        </ProtectedRoute>
      }>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="profile" element={<Profile />} />
        <Route path="notifications" element={<Notifications />} />

        <Route path="assessments" element={<AssessmentList />} />
        <Route path="assessments/new" element={<AssessmentForm />} />
        <Route path="assessments/:id" element={<AssessmentDetail />} />

        <Route path="plans" element={<PlanList />} />
        <Route path="plans/new" element={<PlanForm />} />
        <Route path="plans/:id" element={<PlanDetail />} />
        <Route path="plans/:id/edit" element={<PlanForm />} />

        <Route path="orders" element={<OrderList />} />
        <Route path="orders/statistics" element={<OrderStatistics />} />
        <Route path="orders/:id" element={<OrderDetail />} />

        <Route path="training" element={<TrainingPlanList />} />
        <Route path="training/new" element={<TrainingPlanForm />} />
        <Route path="training/:id" element={<TrainingPlanDetail />} />
        <Route path="training/:id/edit" element={<TrainingPlanForm />} />
        <Route path="training/records/new" element={<TrainingRecordForm />} />
        <Route path="training/records/:id" element={<TrainingRecordDetail />} />

        <Route path="appointments" element={<AppointmentList />} />
        <Route path="appointments/new" element={<AppointmentForm />} />
        <Route path="appointments/calendar" element={<AppointmentCalendar />} />
        <Route path="appointments/:id" element={<AppointmentDetail />} />

        <Route path="finance" element={<FinanceRecords />} />
        <Route path="finance/statistics" element={<FinanceStatistics />} />

        <Route path="reports/monthly" element={<MonthlyReportList />} />
        <Route path="reports/monthly/:month" element={<MonthlyReportDetail />} />

        <Route path="devices" element={<DeviceList />} />
        <Route path="devices/new" element={<DeviceForm />} />
        <Route path="devices/:id" element={<DeviceDetail />} />
        <Route path="devices/:id/edit" element={<DeviceForm />} />

        <Route path="users" element={<UserList />} />
        <Route path="users/new" element={<UserForm />} />
        <Route path="users/:id" element={<UserDetail />} />
        <Route path="users/:id/edit" element={<UserForm />} />

        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}

export default App
