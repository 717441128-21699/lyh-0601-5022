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
  Divider,
  Row,
  Col,
  Modal
} from 'antd'
import {
  ArrowLeftOutlined,
  EditOutlined,
  CheckOutlined,
  CloseOutlined,
  ShoppingCartOutlined
} from '@ant-design/icons'
import { planAPI } from '../../services/api'
import useUserStore from '../../store/useUserStore'
import { PLAN_STATUS_MAP } from '../../utils/constants'
import dayjs from 'dayjs'

const { confirm } = Modal

const PlanDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useUserStore()
  const [loading, setLoading] = useState(false)
  const [detail, setDetail] = useState(null)
  const [operating, setOperating] = useState(false)

  const fetchDetail = async () => {
    setLoading(true)
    try {
      const res = await planAPI.getPlanDetail(id)
      if (res.code === 200) {
        setDetail(res.data)
      }
    } catch (error) {
      console.error('获取方案详情失败:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDetail()
  }, [id])

  const handleStatusUpdate = async (status, actionText) => {
    confirm({
      title: `确认${actionText}该方案？`,
      content: status === 'confirmed' ? '确认后将生成订单' : '请填写拒绝原因',
      okText: `确认${actionText}`,
      cancelText: '取消',
      onOk: async () => {
        setOperating(true)
        try {
          const res = await planAPI.updatePlanStatus(id, { status })
          if (res.code === 200) {
            message.success(`方案${actionText}成功`)
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

  const handleGenerateOrder = async () => {
    setOperating(true)
    try {
      const res = await planAPI.generateOrder(id)
      if (res.code === 200) {
        message.success('订单生成成功')
        navigate(`/orders/${res.data?.id}`)
      }
    } catch (error) {
      console.error('生成订单失败:', error)
    } finally {
      setOperating(false)
    }
  }

  const statusInfo = detail ? (PLAN_STATUS_MAP[detail.status] || { label: detail.status, color: 'default' }) : { label: '-', color: 'default' }

  const deviceColumns = [
    {
      title: '器具名称',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <Space>
          {text}
          {record.category && <Tag color="blue">{record.category}</Tag>}
        </Space>
      )
    },
    {
      title: '单价',
      dataIndex: 'price',
      key: 'price',
      width: 120,
      render: (text) => `¥${Number(text).toLocaleString()}`
    },
    {
      title: '数量',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 100
    },
    {
      title: '小计',
      key: 'subtotal',
      width: 140,
      render: (_, record) => `¥${(record.price * record.quantity).toLocaleString()}`
    }
  ]

  const devices = detail?.devices || []
  const totalPrice = devices.reduce((sum, item) => sum + (item.price * item.quantity), 0)

  const canEdit = (user?.role === 'adapter' || user?.role === 'admin') && detail?.status === 'draft'
  const canConfirm = user?.role === 'disabled' && detail?.status === 'draft'
  const canReject = user?.role === 'disabled' && detail?.status === 'draft'
  const canGenerateOrder = detail?.status === 'confirmed'

  return (
    <div>
      <Button
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate('/plans')}
        style={{ marginBottom: 20 }}
      >
        返回列表
      </Button>

      <div className="page-title">
        <Space>
          方案详情
          <Tag color={statusInfo.color}>{statusInfo.label}</Tag>
        </Space>
      </div>

      <Card loading={loading} className="detail-card">
        <div className="detail-title">方案基本信息</div>
        <Descriptions column={2} bordered size="small">
          <Descriptions.Item label="方案编号">{detail?.id || '-'}</Descriptions.Item>
          <Descriptions.Item label="方案名称">{detail?.name || '-'}</Descriptions.Item>
          <Descriptions.Item label="关联评估">{detail?.assessmentId ? `#${detail.assessmentId}` : '-'}</Descriptions.Item>
          <Descriptions.Item label="用户姓名">{detail?.userName || '-'}</Descriptions.Item>
          <Descriptions.Item label="器具数量">{devices.length}</Descriptions.Item>
          <Descriptions.Item label="总金额">
            <span style={{ color: '#f5222d', fontWeight: 600 }}>¥{totalPrice.toLocaleString()}</span>
          </Descriptions.Item>
          <Descriptions.Item label="创建时间" span={2}>
            {detail?.createdAt ? dayjs(detail.createdAt).format('YYYY-MM-DD HH:mm:ss') : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="方案描述" span={2}>{detail?.description || '-'}</Descriptions.Item>
        </Descriptions>
      </Card>

      <Card className="detail-card" title="推荐器具列表">
        <Table
          columns={deviceColumns}
          dataSource={devices}
          rowKey="id"
          pagination={false}
          size="small"
          summary={() => (
            <Table.Summary.Row>
              <Table.Summary.Cell index={0} colSpan={3} align="right">
                <strong>合计：</strong>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={1}>
                <strong style={{ color: '#f5222d', fontSize: 16 }}>¥{totalPrice.toLocaleString()}</strong>
              </Table.Summary.Cell>
            </Table.Summary.Row>
          )}
        />
      </Card>

      <Card className="detail-card">
        <div className="detail-title">方案说明</div>
        <Row gutter={24}>
          <Col span={24}>
            <div className="detail-item">
              <div className="detail-label">使用说明</div>
              <div className="detail-value">{detail?.usageInstructions || '-'}</div>
            </div>
          </Col>
          <Col span={12}>
            <div className="detail-item">
              <div className="detail-label">注意事项</div>
              <div className="detail-value">{detail?.precautions || '-'}</div>
            </div>
          </Col>
          <Col span={12}>
            <div className="detail-item">
              <div className="detail-label">预期效果</div>
              <div className="detail-value">{detail?.expectedEffect || '-'}</div>
            </div>
          </Col>
        </Row>
      </Card>

      {(canEdit || canConfirm || canReject || canGenerateOrder) && (
        <Card className="detail-card">
          <div style={{ textAlign: 'center', padding: '12px 0' }}>
            <Space size="large">
              {canEdit && (
                <Button
                  type="primary"
                  size="large"
                  icon={<EditOutlined />}
                  onClick={() => navigate(`/plans/${id}/edit`)}
                >
                  编辑方案
                </Button>
              )}
              {canConfirm && (
                <Button
                  type="primary"
                  size="large"
                  icon={<CheckOutlined />}
                  loading={operating}
                  onClick={() => handleStatusUpdate('confirmed', '确认')}
                >
                  确认方案
                </Button>
              )}
              {canReject && (
                <Button
                  size="large"
                  danger
                  icon={<CloseOutlined />}
                  loading={operating}
                  onClick={() => handleStatusUpdate('rejected', '拒绝')}
                >
                  拒绝方案
                </Button>
              )}
              {canGenerateOrder && (
                <Button
                  type="primary"
                  size="large"
                  icon={<ShoppingCartOutlined />}
                  loading={operating}
                  onClick={handleGenerateOrder}
                >
                  生成订单
                </Button>
              )}
            </Space>
          </div>
        </Card>
      )}
    </div>
  )
}

export default PlanDetail
