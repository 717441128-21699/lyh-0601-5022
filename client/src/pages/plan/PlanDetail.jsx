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
  Form,
  Input
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
const { TextArea } = Input

const PlanDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useUserStore()
  const [loading, setLoading] = useState(false)
  const [detail, setDetail] = useState(null)
  const [operating, setOperating] = useState(false)
  const [orderModalVisible, setOrderModalVisible] = useState(false)
  const [orderForm] = Form.useForm()

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

  const handleShowOrderModal = () => {
    setOrderModalVisible(true)
  }

  const handleGenerateOrder = async () => {
    try {
      const values = await orderForm.validateFields()
      setOperating(true)
      const res = await planAPI.generateOrder(id, values)
      if (res.code === 200) {
        message.success('订单生成成功')
        setOrderModalVisible(false)
        navigate(`/orders/${res.data?.id}`)
      }
    } catch (error) {
      if (error?.message) {
        if (error.message.includes('已生成有效订单')) {
          message.warning('该方案已生成有效订单，请勿重复操作')
        } else if (error.message.includes('只有已确认的方案')) {
          message.warning('只有已确认的方案才能生成订单')
        } else if (error.message.includes('权限不足')) {
          message.error('权限不足，您无法为此方案生成订单')
        } else {
          message.error(error.message || '生成订单失败')
        }
      }
      console.error('生成订单失败:', error)
    } finally {
      setOperating(false)
    }
  }

  const statusInfo = detail ? (PLAN_STATUS_MAP[detail.status] || { label: detail.status, color: 'default' }) : { label: '-', color: 'default' }

  const deviceColumns = [
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
      render: (_, record) => `¥${(record.unit_price * record.quantity).toLocaleString()}`
    }
  ]

  const devices = detail?.devices || []
  const totalPrice = devices.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0)

  const canEdit = (user?.role === 'adapter' || user?.role === 'admin') && ['draft', 'modified', 'rejected'].includes(detail?.status)
  const canConfirm = user?.role === 'disabled' && detail?.user_id === user?.id && ['draft', 'modified'].includes(detail?.status)
  const canReject = user?.role === 'disabled' && detail?.user_id === user?.id && ['draft', 'modified'].includes(detail?.status)
  const canGenerateOrder = detail?.status === 'confirmed' && (
    (user?.role === 'disabled' && detail?.user_id === user?.id) ||
    (user?.role === 'adapter' && detail?.adapter_id === user?.id) ||
    user?.role === 'admin'
  )

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
          <Descriptions.Item label="方案名称">{detail?.plan_name || '-'}</Descriptions.Item>
          <Descriptions.Item label="关联评估">{detail?.assessment_id ? `#${detail.assessment_id}` : '-'}</Descriptions.Item>
          <Descriptions.Item label="用户姓名">{detail?.user_name || '-'}</Descriptions.Item>
          <Descriptions.Item label="适配师">{detail?.adapter_name || '-'}</Descriptions.Item>
          <Descriptions.Item label="器具数量">{devices.length}</Descriptions.Item>
          <Descriptions.Item label="总金额">
            <span style={{ color: '#f5222d', fontWeight: 600 }}>¥{totalPrice.toLocaleString()}</span>
          </Descriptions.Item>
          <Descriptions.Item label="创建时间" span={2}>
            {detail?.created_at ? dayjs(detail.created_at).format('YYYY-MM-DD HH:mm:ss') : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="方案描述" span={2}>{detail?.plan_description || '-'}</Descriptions.Item>
        </Descriptions>
      </Card>

      <Card className="detail-card" title="推荐器具列表">
        <Table
          columns={deviceColumns}
          dataSource={devices}
          rowKey="device_id"
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
              <div className="detail-value">{detail?.usage_instructions || '-'}</div>
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
              <div className="detail-value">{detail?.estimated_effect || '-'}</div>
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
                  onClick={handleShowOrderModal}
                >
                  生成订单
                </Button>
              )}
            </Space>
          </div>
        </Card>
      )}

      <Modal
        title="填写收货信息"
        open={orderModalVisible}
        onOk={handleGenerateOrder}
        onCancel={() => setOrderModalVisible(false)}
        confirmLoading={operating}
        okText="确认生成订单"
        cancelText="取消"
        width={500}
      >
        <Form
          form={orderForm}
          layout="vertical"
          initialValues={{
            contact_name: detail?.user_name || '',
            contact_phone: detail?.user_phone || '',
            delivery_address: ''
          }}
        >
          <Form.Item
            label="收货人姓名"
            name="contact_name"
            rules={[{ required: true, message: '请输入收货人姓名' }]}
          >
            <Input placeholder="请输入收货人姓名" maxLength={50} />
          </Form.Item>
          <Form.Item
            label="联系电话"
            name="contact_phone"
            rules={[
              { required: true, message: '请输入联系电话' },
              { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号码' }
            ]}
          >
            <Input placeholder="请输入联系电话" maxLength={11} />
          </Form.Item>
          <Form.Item
            label="收货地址"
            name="delivery_address"
            rules={[{ required: true, message: '请输入收货地址' }]}
          >
            <TextArea rows={3} placeholder="请输入详细收货地址" maxLength={200} />
          </Form.Item>
          <Form.Item
            label="备注"
            name="remark"
          >
            <TextArea rows={2} placeholder="选填，其他说明" maxLength={200} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default PlanDetail
