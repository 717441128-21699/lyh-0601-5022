import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Table, Button, Form, Select, Space, Tag, Input, Popconfirm, message, Switch } from 'antd'
import { SearchOutlined, PlusOutlined, EyeOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import { deviceAPI } from '../../services/api'
import { DISABILITY_TYPES } from '../../utils/constants'

const { Option } = Select

const CATEGORIES = [
  { value: '轮椅', label: '轮椅' },
  { value: '助行器具', label: '助行器具' },
  { value: '康复辅具', label: '康复辅具' },
  { value: '假肢矫形', label: '假肢矫形' },
  { value: '视听辅助', label: '视听辅助' },
  { value: '生活自助', label: '生活自助' }
]

const SUBCATEGORIES = {
  '轮椅': ['电动轮椅', '手动轮椅', '运动轮椅', '轻便轮椅'],
  '助行器具': ['助行器', '拐杖', '手杖', '助行架'],
  '康复辅具': ['矫形器', '牵引器', '按摩器', '康复训练器'],
  '假肢矫形': ['上肢假肢', '下肢假肢', '矫形鞋垫', '脊柱矫形器'],
  '视听辅助': ['助听器', '助视器', '盲文设备', '语音提示器'],
  '生活自助': ['进食器具', '穿衣辅具', '洗浴辅具', '如厕辅具']
}

const DeviceList = () => {
  const navigate = useNavigate()
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
      const res = await deviceAPI.getDevices({
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
      console.error('获取设备列表失败:', error)
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
    if (values.category) params.category = values.category
    if (values.subcategory) params.subcategory = values.subcategory
    if (values.status) params.status = values.status
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

  const handleDelete = async (id) => {
    try {
      const res = await deviceAPI.deleteDevice(id)
      if (res.code === 200) {
        message.success('删除成功')
        fetchData()
      }
    } catch (error) {
      console.error('删除设备失败:', error)
    }
  }

  const handleToggleStatus = async (record) => {
    try {
      const newStatus = record.status === 'online' ? 'offline' : 'online'
      const res = await deviceAPI.updateDevice(record.id, { status: newStatus })
      if (res.code === 200) {
        message.success(record.status === 'online' ? '已下架' : '已上架')
        fetchData()
      }
    } catch (error) {
      console.error('更新状态失败:', error)
    }
  }

  const columns = [
    {
      title: '设备名称',
      dataIndex: 'name',
      key: 'name',
      width: 200,
      ellipsis: true
    },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      width: 120
    },
    {
      title: '子分类',
      dataIndex: 'subcategory',
      key: 'subcategory',
      width: 120
    },
    {
      title: '价格',
      dataIndex: 'price',
      key: 'price',
      width: 120,
      render: (text) => text ? `¥${Number(text).toLocaleString()}` : '-'
    },
    {
      title: '库存',
      dataIndex: 'stock',
      key: 'stock',
      width: 100,
      render: (text) => text || 0
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status) => {
        const statusMap = {
          online: { label: '已上架', color: 'green' },
          offline: { label: '已下架', color: 'default' }
        }
        const info = statusMap[status] || { label: status, color: 'default' }
        return <Tag color={info.color}>{info.label}</Tag>
      }
    },
    {
      title: '操作',
      key: 'action',
      width: 280,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/devices/${record.id}`)}
          >
            详情
          </Button>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => navigate(`/devices/${record.id}/edit`)}
          >
            编辑
          </Button>
          <Switch
            checked={record.status === 'online'}
            onChange={() => handleToggleStatus(record)}
            size="small"
            checkedChildren="上架"
            unCheckedChildren="下架"
          />
          <Popconfirm
            title="确定删除该设备吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button
              type="link"
              size="small"
              danger
              icon={<DeleteOutlined />}
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      )
    }
  ]

  const [selectedCategory, setSelectedCategory] = useState()

  const subcategoryOptions = selectedCategory ? (SUBCATEGORIES[selectedCategory] || []).map(item => ({ value: item, label: item })) : []

  return (
    <div>
      <div className="page-title">设备管理</div>

      <div className="toolbar">
        <Form
          form={form}
          layout="inline"
          onFinish={handleSearch}
          style={{ flexWrap: 'wrap', gap: 12, flex: 1 }}
        >
          <Form.Item name="keyword">
            <Input
              placeholder="搜索设备名称"
              prefix={<SearchOutlined />}
              allowClear
              style={{ width: 200 }}
            />
          </Form.Item>
          <Form.Item name="category">
            <Select
              placeholder="分类"
              allowClear
              style={{ width: 140 }}
              onChange={(value) => {
                setSelectedCategory(value)
                form.setFieldsValue({ subcategory: undefined })
              }}
            >
              {CATEGORIES.map(item => (
                <Option key={item.value} value={item.value}>{item.label}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="subcategory">
            <Select placeholder="子分类" allowClear style={{ width: 140 }}>
              {subcategoryOptions.map(item => (
                <Option key={item.value} value={item.value}>{item.label}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="status">
            <Select placeholder="状态" allowClear style={{ width: 120 }}>
              <Option value="online">已上架</Option>
              <Option value="offline">已下架</Option>
            </Select>
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
        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/devices/create')}>
          新增设备
        </Button>
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

export default DeviceList
