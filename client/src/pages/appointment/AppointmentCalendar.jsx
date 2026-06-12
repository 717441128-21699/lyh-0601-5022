import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Button,
  Card,
  Calendar,
  Tag,
  List,
  Space,
  Badge,
  Select,
  Empty,
  Spin,
  Modal,
  Descriptions
} from 'antd'
import {
  ArrowLeftOutlined,
  UserOutlined,
  ClockCircleOutlined,
  EyeOutlined
} from '@ant-design/icons'
import { appointmentAPI } from '../../services/api'
import useUserStore from '../../store/useUserStore'
import { APPOINTMENT_STATUS_MAP, APPOINTMENT_TYPE_MAP } from '../../utils/constants'
import dayjs from 'dayjs'

const { Option } = Select
const { Meta } = Card

const AppointmentCalendar = () => {
  const navigate = useNavigate()
  const { user } = useUserStore()
  const [loading, setLoading] = useState(false)
  const [selectedDate, setSelectedDate] = useState(dayjs())
  const [appointments, setAppointments] = useState([])
  const [dayAppointments, setDayAppointments] = useState([])
  const [detailModal, setDetailModal] = useState(false)
  const [currentDetail, setCurrentDetail] = useState(null)

  const fetchAppointments = async (date) => {
    setLoading(true)
    try {
      const res = await appointmentAPI.getList({
        month: date.format('YYYY-MM')
      })
      if (res.code === 200) {
        setAppointments(res.data?.list || res.data || [])
      }
    } catch (error) {
      console.error('获取预约列表失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchDayAppointments = async (date) => {
    setLoading(true)
    try {
      const res = await appointmentAPI.getList({
        date: date.format('YYYY-MM-DD')
      })
      if (res.code === 200) {
        setDayAppointments(res.data?.list || res.data || [])
      }
    } catch (error) {
      console.error('获取当日预约失败:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAppointments(selectedDate)
    fetchDayAppointments(selectedDate)
  }, [])

  const handleDateSelect = (date) => {
    setSelectedDate(date)
    fetchDayAppointments(date)
  }

  const handlePanelChange = (date) => {
    setSelectedDate(date)
    fetchAppointments(date)
  }

  const getListData = (value) => {
    const dateStr = value.format('YYYY-MM-DD')
    const dayAppts = appointments.filter(item => 
      dayjs(item.appointmentTime).format('YYYY-MM-DD') === dateStr
    )
    return dayAppts
  }

  const dateCellRender = (value) => {
    const listData = getListData(value)
    return (
      <ul className="events">
        {listData.slice(0, 2).map((item, index) => {
          const typeInfo = APPOINTMENT_TYPE_MAP[item.type] || { label: item.type, color: 'default' }
          const statusInfo = APPOINTMENT_STATUS_MAP[item.status] || { label: item.status, color: 'default' }
          return (
            <li key={item.id || index} style={{ marginBottom: 2, fontSize: 12 }}>
              <Badge
                status={statusInfo.color}
                text={
                  <span style={{ fontSize: 12 }}>
                    {dayjs(item.appointmentTime).format('HH:mm')} {typeInfo.label}
                  </span>
                }
              />
            </li>
          )
        })}
        {listData.length > 2 && (
          <li style={{ fontSize: 12, color: '#999' }}>
            还有 {listData.length - 2} 条
          </li>
        )}
      </ul>
    )
  }

  const handleViewDetail = (appointment) => {
    navigate(`/appointments/${appointment.id}`)
  }

  const statusColorMap = {
    pending: 'orange',
    confirmed: 'green',
    cancelled: 'red',
    completed: 'blue',
    no_show: 'default'
  }

  return (
    <div>
      <Button
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate('/appointments')}
        style={{ marginBottom: 20 }}
      >
        返回列表
      </Button>

      <div className="page-title">预约日历视图</div>

      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Card className="detail-card">
          <Calendar
            dateCellRender={dateCellRender}
            value={selectedDate}
            onSelect={handleDateSelect}
            onPanelChange={handlePanelChange}
          />
        </Card>

        <Card
          className="detail-card"
          title={
            <Space>
              <ClockCircleOutlined />
              {selectedDate.format('YYYY年MM月DD日')} 预约详情
              <Tag color="blue">{dayAppointments.length} 条预约</Tag>
            </Space>
          }
        >
          <Spin spinning={loading}>
            {dayAppointments.length === 0 ? (
              <Empty description="当日暂无预约" />
            ) : (
              <List
                dataSource={dayAppointments}
                renderItem={(item) => {
                  const typeInfo = APPOINTMENT_TYPE_MAP[item.type] || { label: item.type, color: 'default' }
                  const statusInfo = APPOINTMENT_STATUS_MAP[item.status] || { label: item.status, color: 'default' }
                  return (
                    <List.Item
                      actions={[
                        <Button
                          key="view"
                          type="link"
                          size="small"
                          icon={<EyeOutlined />}
                          onClick={() => handleViewDetail(item)}
                        >
                          查看详情
                        </Button>
                      ]}
                    >
                      <List.Item.Meta
                        avatar={
                          <div style={{
                            width: 48,
                            height: 48,
                            borderRadius: '50%',
                            background: `${statusColorMap[item.status] || '#1890ff'}15`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            <UserOutlined style={{ color: statusColorMap[item.status] || '#1890ff', fontSize: 20 }} />
                          </div>
                        }
                        title={
                          <Space>
                            {dayjs(item.appointmentTime).format('HH:mm')}
                            <Tag color={typeInfo.color}>{typeInfo.label}</Tag>
                            <Tag color={statusInfo.color}>{statusInfo.label}</Tag>
                          </Space>
                        }
                        description={
                          <div>
                            <div>用户：{item.userName || '-'}</div>
                            <div>康复师：{item.therapistName || '-'}</div>
                            <div>地点：{item.location || '-'}</div>
                          </div>
                        }
                      />
                    </List.Item>
                  )
                }}
              />
            )}
          </Spin>
        </Card>
      </Space>
    </div>
  )
}

export default AppointmentCalendar
