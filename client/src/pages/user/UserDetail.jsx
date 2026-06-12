import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Button, Card, Tag, Descriptions, Space, Row, Col, Statistic } from 'antd'
import { ArrowLeftOutlined, EditOutlined, UserOutlined } from '@ant-design/icons'
import { userAPI } from '../../services/api'
import { ROLE_MAP } from '../../utils/constants'
import dayjs from 'dayjs'

const UserDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [detail, setDetail] = useState(null)

  const fetchDetail = async () => {
    setLoading(true)
    try {
      const res = await userAPI.getUserDetail(id)
      if (res.code === 200) {
        setDetail(res.data)
      }
    } catch (error) {
      console.error('获取用户详情失败:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDetail()
  }, [id])

  const roleInfo = detail ? (ROLE_MAP[detail.role] || { label: detail.role, color: 'default' }) : { label: '-', color: 'default' }

  const statusMap = {
    active: { label: '正常', color: 'green' },
    disabled: { label: '禁用', color: 'red' }
  }

  const statusInfo = detail ? (statusMap[detail.status] || { label: detail.status, color: 'default' }) : { label: '-', color: 'default' }

  const stats = detail?.stats || {
    assessmentCount: 0,
    orderCount: 0,
    planCount: 0,
    appointmentCount: 0
  }

  const renderRoleInfo = () => {
    if (!detail) return null

    switch (detail.role) {
      case 'disabled':
        return (
          <Card className="detail-card" title="残障人士信息">
            <Descriptions column={2} bordered size="small">
              <Descriptions.Item label="残疾类型">{detail.disabilityType || '-'}</Descriptions.Item>
              <Descriptions.Item label="残疾等级">{detail.disabilityLevel || '-'}</Descriptions.Item>
              <Descriptions.Item label="身高">{detail.height ? `${detail.height} cm` : '-'}</Descriptions.Item>
              <Descriptions.Item label="体重">{detail.weight ? `${detail.weight} kg` : '-'}</Descriptions.Item>
              <Descriptions.Item label="年龄">{detail.age ? `${detail.age} 岁` : '-'}</Descriptions.Item>
              <Descriptions.Item label="性别">
                {detail.gender === 'male' ? '男' : detail.gender === 'female' ? '女' : '-'}
              </Descriptions.Item>
            </Descriptions>
          </Card>
        )
      case 'adapter':
        return (
          <Card className="detail-card" title="适配师信息">
            <Descriptions column={2} bordered size="small">
              <Descriptions.Item label="执业证号">{detail.licenseNumber || '-'}</Descriptions.Item>
              <Descriptions.Item label="从业年限">{detail.experienceYears ? `${detail.experienceYears} 年` : '-'}</Descriptions.Item>
              <Descriptions.Item label="专长" span={2}>{detail.specialty || '-'}</Descriptions.Item>
              <Descriptions.Item label="工作区域" span={2}>{detail.workArea || '-'}</Descriptions.Item>
            </Descriptions>
          </Card>
        )
      case 'therapist':
        return (
          <Card className="detail-card" title="康复师信息">
            <Descriptions column={2} bordered size="small">
              <Descriptions.Item label="执业证号">{detail.licenseNumber || '-'}</Descriptions.Item>
              <Descriptions.Item label="从业年限">{detail.experienceYears ? `${detail.experienceYears} 年` : '-'}</Descriptions.Item>
              <Descriptions.Item label="专长" span={2}>{detail.specialty || '-'}</Descriptions.Item>
              <Descriptions.Item label="工作地址" span={2}>{detail.workAddress || '-'}</Descriptions.Item>
              <Descriptions.Item label="工作时间" span={2}>{detail.workTime || '-'}</Descriptions.Item>
            </Descriptions>
          </Card>
        )
      default:
        return null
    }
  }

  return (
    <div>
      <Button
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate('/users')}
        style={{ marginBottom: 20 }}
      >
        返回列表
      </Button>

      <div className="page-title">
        <Space>
          用户详情
          <Tag color={roleInfo.color}>{roleInfo.label}</Tag>
          <Tag color={statusInfo.color}>{statusInfo.label}</Tag>
        </Space>
        <Button
          type="primary"
          size="small"
          icon={<EditOutlined />}
          style={{ float: 'right' }}
          onClick={() => navigate(`/users/${id}/edit`)}
        >
          编辑
        </Button>
      </div>

      <Card loading={loading} className="detail-card">
        <div className="detail-title">基本信息</div>
        <Descriptions column={2} bordered size="small">
          <Descriptions.Item label="用户名">{detail?.username || '-'}</Descriptions.Item>
          <Descriptions.Item label="姓名">{detail?.name || '-'}</Descriptions.Item>
          <Descriptions.Item label="手机号">{detail?.phone || '-'}</Descriptions.Item>
          <Descriptions.Item label="邮箱">{detail?.email || '-'}</Descriptions.Item>
          <Descriptions.Item label="角色">
            <Tag color={roleInfo.color}>{roleInfo.label}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="状态">
            <Tag color={statusInfo.color}>{statusInfo.label}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="注册时间" span={2}>
            {detail?.createdAt ? dayjs(detail.createdAt).format('YYYY-MM-DD HH:mm:ss') : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="更新时间" span={2}>
            {detail?.updatedAt ? dayjs(detail.updatedAt).format('YYYY-MM-DD HH:mm:ss') : '-'}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      {renderRoleInfo()}

      <Card className="detail-card" title="数据概览">
        <Row gutter={16}>
          <Col span={6}>
            <Statistic title="评估数量" value={stats.assessmentCount} valueStyle={{ color: '#1890ff' }} />
          </Col>
          <Col span={6}>
            <Statistic title="方案数量" value={stats.planCount} valueStyle={{ color: '#52c41a' }} />
          </Col>
          <Col span={6}>
            <Statistic title="订单数量" value={stats.orderCount} valueStyle={{ color: '#faad14' }} />
          </Col>
          <Col span={6}>
            <Statistic title="预约数量" value={stats.appointmentCount} valueStyle={{ color: '#722ed1' }} />
          </Col>
        </Row>
      </Card>
    </div>
  )
}

export default UserDetail
