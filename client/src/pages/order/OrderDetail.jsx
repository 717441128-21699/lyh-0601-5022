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
  Modal,
  Timeline
} from 'antd'
import {
  ArrowLeftOutlined,
  PayCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ShoppingOutlined
} from '@ant-design/icons'
import { orderAPI } from '../../services/api'
import useUserStore from '../../store/useUserStore'
import { ORDER_STATUS_MAP, PAYMENT_STATUS_MAP } from '../../utils/constants'
import dayjs from 'dayjs'

const { confirm } = Modal

const OrderDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useUserStore()
  const [loading, setLoading] = useState(false)
  const [detail, setDetail] = useState(null)
  const [items, setItems] = useState([])
  const [operating, setOperating] = useState(false)

  const fetchDetail = async () => {
    setLoading(true)
    try {
      const res = await orderAPI.getOrderDetail(id)
      if (res.code === 200) {
        setDetail(res.data)
      }
    } catch (error) {
      console.error('获取订单详情失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchItems = async () => {
    try {
      const res = await orderAPI.getOrderItems(id)
      if (res.code === 200) {
        setItems(res.data?.list || res.data || [])
      }
    } catch (error) {
      console.error('获取订单明细失败:', error)
    }
  }

  useEffect(() => {
    fetchDetail()
    fetchItems()
  }, [id])

  const handlePay = () => {
    confirm({
      title: '确认支付订单？',
      content: `订单金额：¥${Number(detail?.actual_amount || 0).toLocaleString()}`,
      okText: '确认支付',
      cancelText: '取消',
      onOk: async () => {
        setOperating(true)
        try {
          const res = await orderAPI.payOrder(id, {})
          if (res.code === 200) {
            message.success('支付成功')
            fetchDetail()
          }
        } catch (error) {
          console.error('支付失败:', error)
        } finally {
          setOperating(false)
        }
      }
    })
  }

  const handleConfirmReceive = () => {
    confirm({
      title: '确认收货？',
      content: '请确认您已收到商品',
      okText: '确认收货',
      cancelText: '取消',
      onOk: async () => {
        setOperating(true)
        try {
          const res = await orderAPI.updateOrderStatus(id, { order_status: 'completed' })
          if (res.code === 200) {
            message.success('确认收货成功')
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

  const handleCancel = () => {
    confirm({
      title: '确认取消订单？',
      content: '取消后订单将无法恢复',
      okText: '确认取消',
      cancelText: '我再想想',
      okType: 'danger',
      onOk: async () => {
        setOperating(true)
        try {
          const res = await orderAPI.updateOrderStatus(id, { order_status: 'cancelled' })
          if (res.code === 200) {
            message.success('订单已取消')
            fetchDetail()
          }
        } catch (error) {
          console.error('取消订单失败:', error)
        } finally {
          setOperating(false)
        }
      }
    })
  }

  const orderStatusInfo = detail ? (ORDER_STATUS_MAP[detail.order_status] || { label: detail.order_status, color: 'default' }) : { label: '-', color: 'default' }
  const paymentStatusInfo = detail ? (PAYMENT_STATUS_MAP[detail.payment_status] || { label: detail.payment_status, color: 'default' }) : { label: '-', color: 'default' }

  const itemColumns = [
    {
      title: '器具名称',
      dataIndex: 'device_name',
      key: 'device_name',
      render: (text, record) => (
        <Space>
          {text}
          {record.category && <Tag color="blue">{record.category}</Tag>}
        </Space>
      )
    },
    {
      title: '单价',
      dataIndex: 'unit_price',
      key: 'unit_price',
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
      render: (_, record) => `¥${((record.unit_price || 0) * (record.quantity || 0)).toLocaleString()}`
    }
  ]

  const totalAmount = items.reduce((sum, item) => sum + ((item.unit_price || 0) * (item.quantity || 0)), 0)

  const generateTimeline = () => {
    const timeline = []
    if (detail?.created_at) {
      timeline.push({
        color: 'green',
        label: '订单创建',
        time: detail.created_at
      })
    }
    if (detail?.order_status === 'confirmed' || detail?.order_status === 'processing' || detail?.order_status === 'shipped' || detail?.order_status === 'delivered' || detail?.order_status === 'completed') {
      timeline.push({
        color: 'blue',
        label: '订单确认',
        time: detail.confirmed_at || detail.created_at
      })
    }
    if (detail?.payment_status === 'paid') {
      timeline.push({
        color: 'green',
        label: '支付成功',
        time: detail.paid_at
      })
    }
    if (detail?.order_status === 'processing' || detail?.order_status === 'shipped' || detail?.order_status === 'delivered' || detail?.order_status === 'completed') {
      timeline.push({
        color: 'purple',
        label: '处理中',
        time: detail.processing_at || detail.confirmed_at
      })
    }
    if (detail?.order_status === 'shipped' || detail?.order_status === 'delivered' || detail?.order_status === 'completed') {
      timeline.push({
        color: 'cyan',
        label: '已发货',
        time: detail.shipped_at
      })
    }
    if (detail?.order_status === 'delivered' || detail?.order_status === 'completed') {
      timeline.push({
        color: 'geekblue',
        label: '已送达',
        time: detail.delivered_at
      })
    }
    if (detail?.order_status === 'completed') {
      timeline.push({
        color: 'green',
        label: '订单完成',
        time: detail.completed_at
      })
    }
    if (detail?.order_status === 'cancelled') {
      timeline.push({
        color: 'red',
        label: '订单取消',
        time: detail.cancelled_at
      })
    }
    return timeline
  }

  const timelineItems = generateTimeline()

  const canPay = user?.role === 'disabled' && (detail?.order_status === 'pending' || detail?.order_status === 'confirmed') && detail?.payment_status === 'unpaid'
  const canCancel = (user?.role === 'disabled' || user?.role === 'admin') && (detail?.order_status === 'pending' || detail?.order_status === 'confirmed')
  const canConfirmReceive = user?.role === 'disabled' && detail?.order_status === 'delivered'
  const canUpdateStatus = user?.role === 'admin' || user?.role === 'finance' || user?.role === 'adapter'

  return (
    <div>
      <Button
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate('/orders')}
        style={{ marginBottom: 20 }}
      >
        返回列表
      </Button>

      <div className="page-title">
        <Space>
          订单详情
          <Tag color={orderStatusInfo.color}>{orderStatusInfo.label}</Tag>
          <Tag color={paymentStatusInfo.color}>{paymentStatusInfo.label}</Tag>
        </Space>
      </div>

      <Row gutter={24}>
        <Col span={16}>
          <Card loading={loading} className="detail-card">
            <div className="detail-title">订单基本信息</div>
            <Descriptions column={2} bordered size="small">
              <Descriptions.Item label="订单号">{detail?.order_no ? `#${detail.order_no}` : '-'}</Descriptions.Item>
              <Descriptions.Item label="关联方案">{detail?.plan_id ? `#${detail.plan_id}` : '-'}</Descriptions.Item>
              <Descriptions.Item label="用户姓名">{detail?.user_name || '-'}</Descriptions.Item>
              <Descriptions.Item label="联系电话">{detail?.contact_phone || '-'}</Descriptions.Item>
              <Descriptions.Item label="订单金额">
                <span style={{ color: '#f5222d', fontWeight: 600 }}>¥{Number(detail?.actual_amount || 0).toLocaleString()}</span>
              </Descriptions.Item>
              <Descriptions.Item label="下单时间">
                {detail?.created_at ? dayjs(detail.created_at).format('YYYY-MM-DD HH:mm:ss') : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="订单备注" span={2}>{detail?.remark || '-'}</Descriptions.Item>
            </Descriptions>
          </Card>

          <Card className="detail-card" title="订单明细">
            <Table
              columns={itemColumns}
              dataSource={items}
              rowKey="id"
              pagination={false}
              size="small"
              summary={() => (
                <Table.Summary.Row>
                  <Table.Summary.Cell index={0} colSpan={3} align="right">
                    <strong>合计：</strong>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={1}>
                    <strong style={{ color: '#f5222d', fontSize: 16 }}>¥{totalAmount.toLocaleString()}</strong>
                  </Table.Summary.Cell>
                </Table.Summary.Row>
              )}
            />
          </Card>
        </Col>

        <Col span={8}>
          <Card className="detail-card">
            <div className="detail-title">收货信息</div>
            <div className="detail-item">
              <div className="detail-label">收货人</div>
              <div className="detail-value">{detail?.contact_name || detail?.user_name || '-'}</div>
            </div>
            <div className="detail-item">
              <div className="detail-label">联系电话</div>
              <div className="detail-value">{detail?.contact_phone || '-'}</div>
            </div>
            <div className="detail-item">
              <div className="detail-label">收货地址</div>
              <div className="detail-value">{detail?.delivery_address || '-'}</div>
            </div>
          </Card>

          <Card className="detail-card">
            <div className="detail-title">订单状态</div>
            <Timeline
              items={timelineItems.map(item => ({
                color: item.color,
                children: (
                  <div>
                    <div style={{ fontWeight: 500 }}>{item.label}</div>
                    <div style={{ color: '#999', fontSize: 12 }}>
                      {item.time ? dayjs(item.time).format('YYYY-MM-DD HH:mm') : '-'}
                    </div>
                  </div>
                )
              }))}
            />
          </Card>
        </Col>
      </Row>

      {(canPay || canCancel || canConfirmReceive || canUpdateStatus) && (
        <Card className="detail-card">
          <div style={{ textAlign: 'center', padding: '12px 0' }}>
            <Space size="large">
              {canPay && (
                <Button
                  type="primary"
                  size="large"
                  icon={<PayCircleOutlined />}
                  loading={operating}
                  onClick={handlePay}
                >
                  立即支付
                </Button>
              )}
              {canConfirmReceive && (
                <Button
                  type="primary"
                  size="large"
                  icon={<CheckCircleOutlined />}
                  loading={operating}
                  onClick={handleConfirmReceive}
                >
                  确认收货
                </Button>
              )}
              {canCancel && (
                <Button
                  size="large"
                  danger
                  icon={<CloseCircleOutlined />}
                  loading={operating}
                  onClick={handleCancel}
                >
                  取消订单
                </Button>
              )}
              {canUpdateStatus && detail?.order_status === 'pending' && (
                <Button
                  type="primary"
                  size="large"
                  icon={<ShoppingOutlined />}
                  loading={operating}
                  onClick={() => {
                    setOperating(true)
                    orderAPI.updateOrderStatus(id, { order_status: 'processing' })
                      .then(res => {
                        if (res.code === 200) {
                          message.success('订单已确认')
                          fetchDetail()
                        }
                      })
                      .catch(err => console.error(err))
                      .finally(() => setOperating(false))
                  }}
                >
                  确认订单
                </Button>
              )}
              {canUpdateStatus && detail?.order_status === 'confirmed' && (
                <Button
                  type="primary"
                  size="large"
                  loading={operating}
                  onClick={() => {
                    setOperating(true)
                    orderAPI.updateOrderStatus(id, { order_status: 'processing' })
                      .then(res => {
                        if (res.code === 200) {
                          message.success('开始处理')
                          fetchDetail()
                        }
                      })
                      .catch(err => console.error(err))
                      .finally(() => setOperating(false))
                  }}
                >
                  开始处理
                </Button>
              )}
              {canUpdateStatus && detail?.order_status === 'processing' && (
                <Button
                  type="primary"
                  size="large"
                  loading={operating}
                  onClick={() => {
                    setOperating(true)
                    orderAPI.updateOrderStatus(id, { order_status: 'shipped' })
                      .then(res => {
                        if (res.code === 200) {
                          message.success('已发货')
                          fetchDetail()
                        }
                      })
                      .catch(err => console.error(err))
                      .finally(() => setOperating(false))
                  }}
                >
                  发货
                </Button>
              )}
              {canUpdateStatus && detail?.order_status === 'shipped' && (
                <Button
                  type="primary"
                  size="large"
                  loading={operating}
                  onClick={() => {
                    setOperating(true)
                    orderAPI.updateOrderStatus(id, { order_status: 'delivered' })
                      .then(res => {
                        if (res.code === 200) {
                          message.success('已送达')
                          fetchDetail()
                        }
                      })
                      .catch(err => console.error(err))
                      .finally(() => setOperating(false))
                  }}
                >
                  确认送达
                </Button>
              )}
            </Space>
          </div>
        </Card>
      )}
    </div>
  )
}

export default OrderDetail
