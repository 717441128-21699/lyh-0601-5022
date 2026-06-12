import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Table, Button, Form, Select, DatePicker, Space, Tag, Input } from 'antd'
import { SearchOutlined, PlusOutlined, EyeOutlined, HomeOutlined } from '@ant-design/icons'
import { assessmentAPI } from '../../services/api'
import useUserStore from '../../store/useUserStore'
import { ASSESSMENT_STATUS_MAP, DISABILITY_TYPES } from '../../utils/constants'
import dayjs from 'dayjs'

const { RangePicker } = DatePicker
const { Option } = Select

const ASSESSMENT_TYPES = [
  { value: 'online', label: '在线评估' },
  { value: 'home', label: '上门评估' }
]

const AssessmentList = () => {
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
      const res = await assessmentAPI.getAssessments({
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
      console.error('获取评估列表失败:', error)
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
    if (values.type) params.type = values.type
    if (values.disabilityType) params.disabilityType = values.disabilityType
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

  const columns = [
    {
      title: '评估编号',
      dataIndex: 'id',
      key: 'id',
      width: 100
    },
    {
      title: '评估类型',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: (text) => {
        const typeMap = {
          online: { label: '在线评估', color: 'blue' },
          home: { label: '上门评估', color: 'green' }
        }
        const type = typeMap[text] || { label: text, color: 'default' }
        return <Tag color={type.color}>{type.label}</Tag>
      }
    },
    {
      title: '用户',
      dataIndex: 'userName',
      key: 'userName',
      width: 120
    },
    {
      title: '残疾类型',
      dataIndex: 'disabilityType',
      key: 'disabilityType',
      width: 120
    },
    {
      title: '残疾等级',
      dataIndex: 'disabilityLevel',
      key: 'disabilityLevel',
      width: 100
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status) => {
        const statusInfo = ASSESSMENT_STATUS_MAP[status] || { label: status, color: 'default' }
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
      width: 200,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/assessments/${record.id}`)}
          >
            查看详情
          </Button>
          {user?.role === 'adapter' && record.status === 'pending' && (
            <Button
              type="link"
              size="small"
              icon={<HomeOutlined />}
              onClick={() => navigate(`/assessments/${record.id}/home`)}
            >
              上门评估
            </Button>
          )}
        </Space>
      )
    }
  ]

  return (
    <div>
      <div className="page-title">评估管理</div>

      <div className="toolbar">
        <Form
          form={form}
          layout="inline"
          onFinish={handleSearch}
          style={{ flexWrap: 'wrap', gap: 12 }}
        >
          <Form.Item name="keyword">
            <Input
              placeholder="搜索用户/编号"
              prefix={<SearchOutlined />}
              allowClear
              style={{ width: 200 }}
            />
          </Form.Item>
          <Form.Item name="status">
            <Select placeholder="状态" allowClear style={{ width: 140 }}>
              {Object.entries(ASSESSMENT_STATUS_MAP).map(([key, value]) => (
                <Option key={key} value={key}>{value.label}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="type">
            <Select placeholder="评估类型" allowClear style={{ width: 140 }}>
              {ASSESSMENT_TYPES.map(item => (
                <Option key={item.value} value={item.value}>{item.label}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="disabilityType">
            <Select placeholder="残疾类型" allowClear style={{ width: 140 }}>
              {DISABILITY_TYPES.map(item => (
                <Option key={item.value} value={item.value}>{item.label}</Option>
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

export default AssessmentList
