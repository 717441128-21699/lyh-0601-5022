import React, { useState, useEffect } from 'react'
import { Table, Button, Form, Select, DatePicker, Space, Tag, Input, Card, Row, Col, Statistic } from 'antd'
import { SearchOutlined, ArrowUpOutlined, ArrowDownOutlined, DollarOutlined } from '@ant-design/icons'
import { financeAPI } from '../../services/api'
import useUserStore from '../../store/useUserStore'
import dayjs from 'dayjs'

const { RangePicker } = DatePicker
const { Option } = Select

const FINANCE_TYPE_MAP = {
  income: { label: '收入', color: 'green' },
  expense: { label: '支出', color: 'red' }
}

const FINANCE_STATUS_MAP = {
  completed: { label: '已完成', color: 'green' },
  pending: { label: '待处理', color: 'orange' },
  failed: { label: '失败', color: 'red' }
}

const FINANCE_CATEGORY_MAP = {
  order: { label: '订单收入', color: 'blue' },
  training: { label: '训练收入', color: 'green' },
  appointment: { label: '预约收入', color: 'purple' },
  refund: { label: '退款', color: 'orange' },
  salary: { label: '工资', color: 'red' },
  other: { label: '其他', color: 'default' }
}

const FinanceRecords = () => {
  const { user } = useUserStore()
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState([])
  const [summary, setSummary] = useState({ totalIncome: 0, totalExpense: 0 })
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0
  })

  const fetchData = async (params = {}) => {
    setLoading(true)
    try {
      const res = await financeAPI.getRecords({
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
      console.error('获取财务记录失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchSummary = async (params = {}) => {
    try {
      const res = await financeAPI.getSummary(params)
      if (res.code === 200) {
        setSummary(res.data || { totalIncome: 0, totalExpense: 0 })
      }
    } catch (error) {
      console.error('获取财务汇总失败:', error)
    }
  }

  useEffect(() => {
    fetchData()
    fetchSummary()
  }, [pagination.current, pagination.pageSize])

  const handleSearch = () => {
    const values = form.getFieldsValue()
    const params = {}
    if (values.type) params.type = values.type
    if (values.status) params.status = values.status
    if (values.category) params.category = values.category
    if (values.dateRange && values.dateRange.length === 2) {
      params.startDate = values.dateRange[0].format('YYYY-MM-DD')
      params.endDate = values.dateRange[1].format('YYYY-MM-DD')
    }
    if (values.keyword) params.keyword = values.keyword
    setPagination(prev => ({ ...prev, current: 1 }))
    fetchData(params)
    fetchSummary(params)
  }

  const handleReset = () => {
    form.resetFields()
    setPagination(prev => ({ ...prev, current: 1 }))
    fetchData()
    fetchSummary()
  }

  const handleTableChange = (page, pageSize) => {
    setPagination(prev => ({ ...prev, current: page, pageSize }))
  }

  const columns = [
    {
      title: '记录编号',
      dataIndex: 'id',
      key: 'id',
      width: 100
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: (type) => {
        const typeInfo = FINANCE_TYPE_MAP[type] || { label: type, color: 'default' }
        return <Tag color={typeInfo.color}>{typeInfo.label}</Tag>
      }
    },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      width: 120,
      render: (category) => {
        const catInfo = FINANCE_CATEGORY_MAP[category] || { label: category, color: 'default' }
        return <Tag color={catInfo.color}>{catInfo.label}</Tag>
      }
    },
    {
      title: '金额',
      dataIndex: 'amount',
      key: 'amount',
      width: 140,
      render: (amount, record) => {
        const isIncome = record.type === 'income'
        return (
          <span style={{ 
            color: isIncome ? '#52c41a' : '#f5222d', 
            fontWeight: 600,
            fontSize: 16
          }}>
            {isIncome ? '+' : '-'}¥{Number(amount).toLocaleString()}
          </span>
        )
      }
    },
    {
      title: '日期',
      dataIndex: 'date',
      key: 'date',
      width: 180,
      render: (text) => text ? dayjs(text).format('YYYY-MM-DD HH:mm') : '-'
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status) => {
        const statusInfo = FINANCE_STATUS_MAP[status] || { label: status, color: 'default' }
        return <Tag color={statusInfo.color}>{statusInfo.label}</Tag>
      }
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true
    },
    {
      title: '关联订单',
      dataIndex: 'orderId',
      key: 'orderId',
      width: 120,
      render: (text) => text ? `#${text}` : '-'
    }
  ]

  return (
    <div>
      <div className="page-title">财务记录</div>

      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={24} sm={12} md={8}>
          <Card className="stat-card" bordered={false}>
            <Statistic
              title="总收入"
              value={summary.totalIncome || 0}
              precision={2}
              valueStyle={{ color: '#52c41a' }}
              prefix={<ArrowUpOutlined />}
              suffix="元"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card className="stat-card" bordered={false}>
            <Statistic
              title="总支出"
              value={summary.totalExpense || 0}
              precision={2}
              valueStyle={{ color: '#f5222d' }}
              prefix={<ArrowDownOutlined />}
              suffix="元"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card className="stat-card" bordered={false}>
            <Statistic
              title="净收入"
              value={(summary.totalIncome || 0) - (summary.totalExpense || 0)}
              precision={2}
              valueStyle={{ color: '#1890ff' }}
              prefix={<DollarOutlined />}
              suffix="元"
            />
          </Card>
        </Col>
      </Row>

      <div className="toolbar">
        <Form
          form={form}
          layout="inline"
          onFinish={handleSearch}
          style={{ flexWrap: 'wrap', gap: 12 }}
        >
          <Form.Item name="keyword">
            <Input
              placeholder="搜索描述/编号"
              prefix={<SearchOutlined />}
              allowClear
              style={{ width: 200 }}
            />
          </Form.Item>
          <Form.Item name="type">
            <Select placeholder="类型" allowClear style={{ width: 120 }}>
              {Object.entries(FINANCE_TYPE_MAP).map(([key, value]) => (
                <Option key={key} value={key}>{value.label}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="category">
            <Select placeholder="分类" allowClear style={{ width: 140 }}>
              {Object.entries(FINANCE_CATEGORY_MAP).map(([key, value]) => (
                <Option key={key} value={key}>{value.label}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="status">
            <Select placeholder="状态" allowClear style={{ width: 120 }}>
              {Object.entries(FINANCE_STATUS_MAP).map(([key, value]) => (
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
          scroll={{ x: 1100 }}
        />
      </div>
    </div>
  )
}

export default FinanceRecords
