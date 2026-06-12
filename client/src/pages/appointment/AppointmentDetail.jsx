import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Button,
  Card,
  Tag,
  Descriptions,
  message,
  Space,
  Modal
} from 'antd'
import {
  ArrowLeftOutlined,
  CheckOutlined,
  CloseOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  UserOutlined
} from '@ant-design/icons'
import { appointmentAPI } from '../../services/api'
import useUserStore from '../../store/useUserStore'
import { APPOINTMENT_STATUS_MAP, APPOINTMENT_TYPE_MAP } from '../../utils/constants'
import dayjs from 'dayjs'

const { confirm } = Modal

const AppointmentDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useUserStore()
  const [loading, setLoading] = useState(false)
  const [detail, setDetail] = useState(null)
  const [operating, setOperating] = useState(false)

  const fetchDetail = async () => {
    setLoading(true)
    try {
      const res = await appointmentAPI.getDetail(id)
      if (res.code === 200) {
        setDetail(res.data)
      }
    } catch (error) {
      console.error('获取预约详情失败:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDetail()
  }, [id])

  const handleStatusUpdate = (status, actionText) => {
    confirm({
      title: `确认${actionText}该预约？`,
      okText: `确认${actionText}`,
      cancelText: '取消',
      onOk: async () => {
        setOperating(true)
        try {
          const res = await appointmentAPI.updateStatus(id, { status })
          if (res.code === 200) {
            message.success(`预约${actionText}成功`)
            fetchDetail()
          }
        } catch (error) {
          console.error('操作失败:', error)
        } finally {
          setOperating(false)
        }
      }
    })
  }

  const statusInfo = detail ? (APPOINTMENT_STATUS_MAP[detail.status] || { label: detail.status, color: 'default' }) : { label: '-', color: 'default' }
  const typeInfo = detail ? (APPOINTMENT_TYPE_MAP[detail.service_type] || { label: detail.service_type, color: 'default' }) : { label: '-', color: 'default' }

  const canConfirm = detail?.status === 'pending' && user?.role === 'therapist'
  const canCancel = (detail?.status === 'pending' || detail?.status === 'confirmed') && user?.role === 'disabled'
  const canComplete = detail?.status === 'confirmed' && user?.role === 'therapist'

  return (
    <div>
      <Button
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate('/appointments')}
        style={{ marginBottom: 20 }}
      >
        返回列表
      </Button>

      <div className="page-title">
        <Space>
          预约详情
          <Tag color={statusInfo.color}>{statusInfo.label}</Tag>
          <Tag color={typeInfo.color}>{typeInfo.label}</Tag>
        </Space>
      </div>

      <Card loading={loading} className="detail-card">
        <div className="detail-title">预约基本信息</div>
        <Descriptions column={2} bordered size="small">
          <Descriptions.Item label="预约编号">{detail?.id || '-'}</Descriptions.Item>
          <Descriptions.Item label="预约类型">
            <Tag color={typeInfo.color}>{typeInfo.label}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="用户姓名">
            <Space>
              <UserOutlined />
              {detail?.user_name || '-'}
            </Space>
          </Descriptions.Item>
          <Descriptions.Item label="康复师">{detail?.therapist_name || '-'}</Descriptions.Item>
          <Descriptions.Item label="预约时间">
            <Space>
              <ClockCircleOutlined />
              {detail?.appointment_time ? dayjs(detail.appointment_time).format('YYYY-MM-DD HH:mm') : '-'}
            </Space>
          </Descriptions.Item>
          <Descriptions.Item label="时长">{detail?.duration ? `${detail.duration}分钟` : '-'}</Descriptions.Item>
          <Descriptions.Item label="创建时间" span={2}>
            {detail?.created_at ? dayjs(detail.created_at).format('YYYY-MM-DD HH:mm:ss') : '-'}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card className="detail-card">
        <div className="detail-title">备注信息</div>
        <div className="detail-item">
          <div className="detail-label">备注</div>
          <div className="detail-value">{detail?.notes || '-'}</div>
        </div>
      </Card>

      {(canConfirm || canCancel || canComplete) && (
        <Card className="detail-card">
          <div style={{ textAlign: 'center', padding: '12px 0' }}>
            <Space size="large">
              {canConfirm && (
                <Button
                  type="primary"
                  size="large"
                  icon={<CheckOutlined />}
                  loading={operating}
                  onClick={() => handleStatusUpdate('confirmed', '确认')}
                >
                  确认预约
                </Button>
              )}
              {canComplete && (
                <Button
                  type="primary"
                  size="large"
                  icon={<CheckCircleOutlined />}
                  loading={operating}
                  onClick={() => handleStatusUpdate('completed', '完成')}
                >
                  完成预约
                </Button>
              )}
              {canCancel && (
                <Button
                  size="large"
                  danger
                  icon={<CloseOutlined />}
                  loading={operating}
                  onClick={() => handleStatusUpdate('cancelled', '取消')}
                >
                  取消预约
                </Button>
              )}
            </Space>
          </div>
        </Card>
      )}
    </div>
  )
}

export default AppointmentDetail
