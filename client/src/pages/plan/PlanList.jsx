import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Table, Button, Form, Select, DatePicker, Space, Tag, Input, message } from 'antd'
import { SearchOutlined, PlusOutlined, EyeOutlined, EditOutlined, ShoppingCartOutlined } from '@ant-design/icons'
import { planAPI } from '../../services/api'
import useUserStore from '../../store/useUserStore'
import { PLAN_STATUS_MAP } from '../../utils/constants'
import dayjs from 'dayjs'

const { RangePicker } = DatePicker
const { Option } = Select

const PlanList = () => {
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
      const res = await planAPI.getPlans({
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
      console.error('获取方案列表失败:', error)
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
    if (values.status) params.status = values.status
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

  const handleGenerateOrder = async (record) => {
    try {
      const res = await planAPI.generateOrder(record.id)
      if (res.code === 200) {
        message.success('订单生成成功')
        navigate(`/orders/${res.data?.id}`)
      }
    } catch (error) {
      console.error('生成订单失败:', error)
    }
  }

  const columns = [
    {
      title: '方案编号',
      dataIndex: 'id',
      key: 'id',
      width: 100
    },
    {
      title: '方案名称',
      dataIndex: 'name',
      key: 'name',
      width: 180
    },
    {
      title: '关联评估',
      dataIndex: 'assessmentId',
      key: 'assessmentId',
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
      title: '器具数量',
      dataIndex: 'deviceCount',
      key: 'deviceCount',
      width: 100,
      render: (text) => text || 0
    },
    {
      title: '总金额',
      dataIndex: 'totalPrice',
      key: 'totalPrice',
      width: 120,
      render: (text) => text ? `¥${Number(text).toLocaleString()}` : '-'
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status) => {
        const statusInfo = PLAN_STATUS_MAP[status] || { label: status, color: 'default' }
        return <Tag color={statusInfo.color}>{statusInfo.label}</Tag>
      }
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (text) => text ? dayjs(text).format('YYYY-MM-DD HH:mm') : '-'
    },
    {
      title: '操作',
      key: 'action',
      width: 220,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/plans/${record.id}`)}
          >
            查看详情
          </Button>
          {(user?.role === 'adapter' || user?.role === 'admin') && record.status === 'draft' && (
            <Button
              type="link"
              size="small"
              icon={<EditOutlined />}
              onClick={() => navigate(`/plans/${record.id}/edit`)}
            >
              编辑
            </Button>
          )}
          {record.status === 'confirmed' && (
            <Button
              type="link"
              size="small"
              icon={<ShoppingCartOutlined />}
              onClick={() => handleGenerateOrder(record)}
            >
              生成订单
            </Button>
          )}
        </Space>
      )
    }
  ]

  const showCreateButton = user?.role === 'adapter' || user?.role === 'admin' || user?.role === 'disabled'

  return (
    <div>
      <div className="page-title">适配方案管理</div>

      <div className="toolbar">
        <Form
          form={form}
          layout="inline"
          onFinish={handleSearch}
          style={{ flexWrap: 'wrap', gap: 12 }}
        >
          <Form.Item name="keyword">
            <Input
              placeholder="搜索方案名称/编号"
              prefix={<SearchOutlined />}
              allowClear
              style={{ width: 200 }}
            />
          </Form.Item>
          <Form.Item name="status">
            <Select placeholder="状态" allowClear style={{ width: 140 }}>
              {Object.entries(PLAN_STATUS_MAP).map(([key, value]) => (
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

        {showCreateButton && (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/plans/create')}>
            创建方案
          </Button>
        )}
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

export default PlanList
