import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Table, Button, Form, Select, DatePicker, Space, Tag, Input, message, Modal } from 'antd'
import { SearchOutlined, EyeOutlined, EditOutlined } from '@ant-design/icons'
import { orderAPI } from '../../services/api'
import useUserStore from '../../store/useUserStore'
import { ORDER_STATUS_MAP, PAYMENT_STATUS_MAP } from '../../utils/constants'
import dayjs from 'dayjs'

const { RangePicker } = DatePicker
const { Option } = Select
const { confirm } = Modal

const OrderList = () => {
  const navigate = useNavigate()
  const { user } = useUserStore()
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState([])
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0
  })

  const fetchData = async (params = {}) => {
    setLoading(true)
    try {
      const res = await orderAPI.getOrders({
        page: pagination.current,
        pageSize: pagination.pageSize,
        ...params
      })
      if (res.code === 200) {
        setData(res.data?.list || res.data || [])
        setPagination(prev => ({
          ...prev,
          total: res.data?.total || res.data?.length || 0
        }))
      }
    } catch (error) {
      console.error('获取订单列表失败:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [pagination.current, pagination.pageSize])

  const handleSearch = () => {
    const values = form.getFieldsValue()
    const params = {}
    if (values.orderStatus) params.status = values.orderStatus
    if (values.paymentStatus) params.paymentStatus = values.paymentStatus
    if (values.dateRange && values.dateRange.length === 2) {
      params.startDate = values.dateRange[0].format('YYYY-MM-DD')
      params.endDate = values.dateRange[1].format('YYYY-MM-DD')
    }
    if (values.keyword) params.keyword = values.keyword
    setPagination(prev => ({ ...prev, current: 1 }))
    fetchData(params)
  }

  const handleReset = () => {
    form.resetFields()
    setPagination(prev => ({ ...prev, current: 1 }))
    fetchData()
  }

  const handleTableChange = (page, pageSize) => {
    setPagination(prev => ({ ...prev, current: page, pageSize }))
  }

  const handleUpdateStatus = (record, status, actionText) => {
    confirm({
      title: `确认${actionText}？`,
      content: `订单号：${record.id}`,
      okText: `确认${actionText}`,
      cancelText: '取消',
      onOk: async () => {
        try {
          const res = await orderAPI.updateOrderStatus(record.id, { status })
          if (res.code === 200) {
            message.success(`订单${actionText}成功`)
            fetchData()
          }
        } catch (error) {
          console.error('操作失败:', error)
        }
      }
    })
  }

  const canUpdateStatus = user?.role === 'admin' || user?.role === 'finance' || user?.role === 'adapter'

  const columns = [
    {
      title: '订单号',
      dataIndex: 'id',
      key: 'id',
      width: 120,
      render: (text) => text ? `#${text}` : '-'
    },
    {
      title: '用户',
      dataIndex: 'userName',
      key: 'userName',
      width: 120
    },
    {
      title: '总金额',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      width: 120,
      render: (text) => text ? `¥${Number(text).toLocaleString()}` : '-'
    },
    {
      title: '订单状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status) => {
        const statusInfo = ORDER_STATUS_MAP[status] || { label: status, color: 'default' }
        return <Tag color={statusInfo.color}>{statusInfo.label}</Tag>
      }
    },
    {
      title: '支付状态',
      dataIndex: 'paymentStatus',
      key: 'paymentStatus',
      width: 100,
      render: (status) => {
        const statusInfo = PAYMENT_STATUS_MAP[status] || { label: status, color: 'default' }
        return <Tag color={statusInfo.color}>{statusInfo.label}</Tag>
      }
    },
    {
      title: '下单时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (text) => text ? dayjs(text).format('YYYY-MM-DD HH:mm') : '-'
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/orders/${record.id}`)}
          >
            查看详情
          </Button>
          {canUpdateStatus && record.status === 'pending' && (
            <Button
              type="link"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleUpdateStatus(record, 'confirmed', '确认')}
            >
              确认订单
            </Button>
          )}
          {canUpdateStatus && record.status === 'processing' && (
            <Button
              type="link"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleUpdateStatus(record, 'shipped', '发货')}
            >
              发货
            </Button>
          )}
          {canUpdateStatus && record.status === 'shipped' && (
            <Button
              type="link"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleUpdateStatus(record, 'delivered', '送达')}
            >
              确认送达
            </Button>
          )}
        </Space>
      )
    }
  ]

  return (
    <div>
      <div className="page-title">订单管理</div>

      <div className="toolbar">
        <Form
          form={form}
          layout="inline"
          onFinish={handleSearch}
          style={{ flexWrap: 'wrap', gap: 12 }}
        >
          <Form.Item name="keyword">
            <Input
              placeholder="搜索订单号/用户名"
              prefix={<SearchOutlined />}
              allowClear
              style={{ width: 200 }}
            />
          </Form.Item>
          <Form.Item name="orderStatus">
            <Select placeholder="订单状态" allowClear style={{ width: 140 }}>
              {Object.entries(ORDER_STATUS_MAP).map(([key, value]) => (
                <Option key={key} value={key}>{value.label}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="paymentStatus">
            <Select placeholder="支付状态" allowClear style={{ width: 140 }}>
              {Object.entries(PAYMENT_STATUS_MAP).map(([key, value]) => (
                <Option key={key} value={key}>{value.label}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="dateRange">
            <RangePicker style={{ width: 280 }} />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" icon={<SearchOutlined />}>
                搜索
              </Button>
              <Button onClick={handleReset}>重置</Button>
            </Space>
          </Form.Item>
        </Form>
      </div>

      <div className="table-container">
        <Table
          columns={columns}
          dataSource={data}
          rowKey="id"
          loading={loading}
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条记录`,
            onChange: handleTableChange
          }}
          scroll={{ x: 1000 }}
        />
      </div>
    </div>
  )
}

export default OrderList
