import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Table, Button, Form, Select, Space, Tag, Input, message, Modal } from 'antd'
import { SearchOutlined, PlusOutlined, EyeOutlined, EditOutlined } from '@ant-design/icons'
import { trainingAPI } from '../../services/api'
import useUserStore from '../../store/useUserStore'
import { TRAINING_PLAN_STATUS_MAP } from '../../utils/constants'
import dayjs from 'dayjs'

const { Option } = Select
const { confirm } = Modal

const TrainingPlanList = () => {
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
      const res = await trainingAPI.getPlans({
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
      console.error('获取训练计划列表失败:', error)
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
      content: `计划名称：${record.plan_name}`,
      okText: `确认${actionText}`,
      cancelText: '取消',
      onOk: async () => {
        try {
          const res = await trainingAPI.updatePlanStatus(record.id, { status })
          if (res.code === 200) {
            message.success(`计划${actionText}成功`)
            fetchData()
          }
        } catch (error) {
          console.error('操作失败:', error)
        }
      }
    })
  }

  const canCreate = user?.role === 'therapist' || user?.role === 'admin'
  const canUpdateStatus = user?.role === 'therapist' || user?.role === 'admin'

  const columns = [
    {
      title: '计划名称',
      dataIndex: 'plan_name',
      key: 'plan_name',
      width: 180
    },
    {
      title: '用户',
      dataIndex: 'user_name',
      key: 'user_name',
      width: 120
    },
    {
      title: '康复师',
      dataIndex: 'therapist_name',
      key: 'therapist_name',
      width: 120
    },
    {
      title: '强度',
      dataIndex: 'current_intensity',
      key: 'current_intensity',
      width: 80,
      render: (val) => val ? `${val}/10` : '-'
    },
    {
      title: '频率',
      dataIndex: 'current_frequency',
      key: 'current_frequency',
      width: 100,
      render: (val) => val ? `${val}次/周` : '-'
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status) => {
        const statusInfo = TRAINING_PLAN_STATUS_MAP[status] || { label: status, color: 'default' }
        return <Tag color={statusInfo.color}>{statusInfo.label}</Tag>
      }
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180,
      render: (text) => text ? dayjs(text).format('YYYY-MM-DD HH:mm') : '-'
    },
    {
      title: '操作',
      key: 'action',
      width: 240,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/training/${record.id}`)}
          >
            查看详情
          </Button>
          {canUpdateStatus && record.status === 'active' && (
            <Button
              type="link"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleUpdateStatus(record, 'suspended', '暂停')}
            >
              暂停
            </Button>
          )}
          {canUpdateStatus && record.status === 'suspended' && (
            <Button
              type="link"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleUpdateStatus(record, 'active', '恢复')}
            >
              恢复
            </Button>
          )}
        </Space>
      )
    }
  ]

  return (
    <div>
      <div className="page-title">训练计划管理</div>

      <div className="toolbar">
        <Form
          form={form}
          layout="inline"
          onFinish={handleSearch}
          style={{ flexWrap: 'wrap', gap: 12 }}
        >
          <Form.Item name="keyword">
            <Input
              placeholder="搜索计划名称/用户名"
              prefix={<SearchOutlined />}
              allowClear
              style={{ width: 200 }}
            />
          </Form.Item>
          <Form.Item name="status">
            <Select placeholder="状态" allowClear style={{ width: 140 }}>
              {Object.entries(TRAINING_PLAN_STATUS_MAP).map(([key, value]) => (
                <Option key={key} value={key}>{value.label}</Option>
              ))}
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

        {canCreate && (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/training/new')}>
            创建计划
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
          scroll={{ x: 1200 }}
        />
      </div>
    </div>
  )
}

export default TrainingPlanList
