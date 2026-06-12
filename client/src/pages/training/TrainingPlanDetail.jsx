import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Button,
  Card,
  Tag,
  Descriptions,
  message,
  Space,
  Table,
  Row,
  Col,
  Progress,
  Statistic,
  Empty,
  Modal
} from 'antd'
import {
  ArrowLeftOutlined,
  PlusOutlined,
  EyeOutlined,
  PauseCircleOutlined,
  PlayCircleOutlined,
  EditOutlined
} from '@ant-design/icons'
import { trainingAPI } from '../../services/api'
import useUserStore from '../../store/useUserStore'
import { TRAINING_PLAN_STATUS_MAP } from '../../utils/constants'
import dayjs from 'dayjs'

const { confirm } = Modal

const TrainingPlanDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useUserStore()
  const [loading, setLoading] = useState(false)
  const [detail, setDetail] = useState(null)
  const [records, setRecords] = useState([])
  const [progress, setProgress] = useState(null)
  const [operating, setOperating] = useState(false)

  const fetchDetail = async () => {
    setLoading(true)
    try {
      const res = await trainingAPI.getPlanDetail(id)
      if (res.code === 200) {
        setDetail(res.data)
      }
    } catch (error) {
      console.error('获取训练计划详情失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchRecords = async () => {
    try {
      const res = await trainingAPI.getPlanRecords(id)
      if (res.code === 200) {
        setRecords(res.data?.list || res.data || [])
      }
    } catch (error) {
      console.error('获取训练记录失败:', error)
    }
  }

  const fetchProgress = async () => {
    try {
      const res = await trainingAPI.getPlanProgress(id)
      if (res.code === 200) {
        setProgress(res.data)
      }
    } catch (error) {
      console.error('获取进度统计失败:', error)
    }
  }

  useEffect(() => {
    fetchDetail()
    fetchRecords()
    fetchProgress()
  }, [id])

  const handleAddRecord = () => {
    navigate(`/training/records/new?planId=${id}`)
  }

  const handleViewRecord = (recordId) => {
    navigate(`/training/records/${recordId}`)
  }

  const handleSuspend = () => {
    confirm({
      title: '确认暂停该训练计划？',
      content: '暂停后可以随时恢复训练',
      okText: '确认暂停',
      cancelText: '取消',
      onOk: async () => {
        setOperating(true)
        try {
          const res = await trainingAPI.updatePlanStatus(id, { status: 'suspended' })
          if (res.code === 200) {
            message.success('计划已暂停')
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

  const handleResume = () => {
    confirm({
      title: '确认恢复该训练计划？',
      content: '恢复后可以继续进行训练',
      okText: '确认恢复',
      cancelText: '取消',
      onOk: async () => {
        setOperating(true)
        try {
          const res = await trainingAPI.updatePlanStatus(id, { status: 'active' })
          if (res.code === 200) {
            message.success('计划已恢复')
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

  const statusInfo = detail ? (TRAINING_PLAN_STATUS_MAP[detail.status] || { label: detail.status, color: 'default' }) : { label: '-', color: 'default' }

  const recordColumns = [
    {
      title: '训练日期',
      dataIndex: 'training_date',
      key: 'training_date',
      width: 120,
      render: (text) => text ? dayjs(text).format('YYYY-MM-DD') : '-'
    },
    {
      title: '训练时长',
      dataIndex: 'duration',
      key: 'duration',
      width: 100,
      render: (val) => val ? `${val}分钟` : '-'
    },
    {
      title: '完成度',
      dataIndex: 'completion_rate',
      key: 'completion_rate',
      width: 180,
      render: (val) => (
        <Progress percent={val || 0} size="small" />
      )
    },
    {
      title: '训练强度',
      dataIndex: 'current_intensity',
      key: 'current_intensity',
      width: 100,
      render: (val) => val ? `${val}/10` : '-'
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_, record) => (
        <Button
          type="link"
          size="small"
          icon={<EyeOutlined />}
          onClick={() => handleViewRecord(record.id)}
        >
          查看详情
        </Button>
      )
    }
  ]

  const canAddRecord = (user?.role === 'disabled' || user?.role === 'therapist' || user?.role === 'admin') && detail?.status === 'active'
  const canSuspend = (user?.role === 'therapist' || user?.role === 'admin') && detail?.status === 'active'
  const canResume = (user?.role === 'therapist' || user?.role === 'admin') && detail?.status === 'suspended'
  const canEdit = (user?.role === 'therapist' || user?.role === 'admin') && detail?.status !== 'completed' && detail?.status !== 'cancelled'

  const avgCompletion = progress?.avgCompletionRate || 0
  const totalTrainings = progress?.totalTrainingCount || records.length
  const currentIntensity = detail?.current_intensity || detail?.initial_intensity || 0
  const currentFrequency = detail?.current_frequency || detail?.initial_frequency || 0

  return (
    <div>
      <Button
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate('/training')}
        style={{ marginBottom: 20 }}
      >
        返回列表
      </Button>

      <div className="page-title">
        <Space>
          训练计划详情
          <Tag color={statusInfo.color}>{statusInfo.label}</Tag>
        </Space>
      </div>

      <Card loading={loading} className="detail-card">
        <div className="detail-title">计划基本信息</div>
        <Descriptions column={2} bordered size="small">
          <Descriptions.Item label="计划名称">{detail?.plan_name || '-'}</Descriptions.Item>
          <Descriptions.Item label="用户姓名">{detail?.user_name || '-'}</Descriptions.Item>
          <Descriptions.Item label="康复师">{detail?.therapist_name || '-'}</Descriptions.Item>
          <Descriptions.Item label="创建时间">
            {detail?.created_at ? dayjs(detail.created_at).format('YYYY-MM-DD') : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="计划描述" span={2}>{detail?.plan_description || '-'}</Descriptions.Item>
          <Descriptions.Item label="初始强度">{detail?.initial_intensity || 0}/10</Descriptions.Item>
          <Descriptions.Item label="初始频率">{detail?.initial_frequency || 0}次/周</Descriptions.Item>
        </Descriptions>
      </Card>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card className="stat-card">
            <Statistic
              title="当前强度"
              value={`${currentIntensity}/10`}
              valueStyle={{ color: '#1890ff' }}
              suffix="级"
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="stat-card">
            <Statistic
              title="当前频率"
              value={currentFrequency}
              valueStyle={{ color: '#52c41a' }}
              suffix="次/周"
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="stat-card">
            <Statistic
              title="训练总次数"
              value={totalTrainings}
              valueStyle={{ color: '#722ed1' }}
              suffix="次"
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="stat-card">
            <Statistic
              title="平均完成度"
              value={avgCompletion}
              valueStyle={{ color: '#fa8c16' }}
              suffix="%"
            />
          </Card>
        </Col>
      </Row>

      <Card className="detail-card" title="训练目标">
        <p style={{ margin: 0 }}>{detail?.notes || '-'}</p>
      </Card>

      <Card
        className="detail-card"
        title="训练记录"
        extra={
          canAddRecord && (
            <Button
              type="primary"
              size="small"
              icon={<PlusOutlined />}
              onClick={handleAddRecord}
            >
              添加记录
            </Button>
          )
        }
      >
        {records.length > 0 ? (
          <Table
            columns={recordColumns}
            dataSource={records}
            rowKey="id"
            pagination={false}
            size="small"
          />
        ) : (
          <Empty description="暂无训练记录" />
        )}
      </Card>

      {(canAddRecord || canSuspend || canResume || canEdit) && (
        <Card className="detail-card">
          <div style={{ textAlign: 'center', padding: '12px 0' }}>
            <Space size="large">
              {canEdit && (
                <Button
                  type="primary"
                  size="large"
                  icon={<EditOutlined />}
                  onClick={() => navigate(`/training/${id}/edit`)}
                >
                  编辑计划
                </Button>
              )}
              {canAddRecord && (
                <Button
                  type="primary"
                  size="large"
                  icon={<PlusOutlined />}
                  onClick={handleAddRecord}
                >
                  添加训练记录
                </Button>
              )}
              {canSuspend && (
                <Button
                  size="large"
                  icon={<PauseCircleOutlined />}
                  loading={operating}
                  onClick={handleSuspend}
                >
                  暂停计划
                </Button>
              )}
              {canResume && (
                <Button
                  type="primary"
                  size="large"
                  icon={<PlayCircleOutlined />}
                  loading={operating}
                  onClick={handleResume}
                >
                  恢复计划
                </Button>
              )}
            </Space>
          </div>
        </Card>
      )}
    </div>
  )
}

export default TrainingPlanDetail
