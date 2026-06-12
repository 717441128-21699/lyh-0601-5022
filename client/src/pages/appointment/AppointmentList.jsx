import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Table, Button, Form, Select, DatePicker, Space, Tag, Modal, message } from 'antd'
import { SearchOutlined, PlusOutlined, EyeOutlined, CheckOutlined, CloseOutlined, CheckCircleOutlined } from '@ant-design/icons'
import { appointmentAPI } from '../../services/api'
import useUserStore from '../../store/useUserStore'
import { APPOINTMENT_STATUS_MAP, APPOINTMENT_TYPE_MAP } from '../../utils/constants'
import dayjs from 'dayjs'

const { Option } = Select
const { confirm } = Modal

const AppointmentList = () => {
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
      const res = await appointmentAPI.getList({
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
      console.error('获取预约列表失败:', error)
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
    if (values.date) params.date = values.date.format('YYYY-MM-DD')
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

  const handleStatusUpdate = (id, status, actionText) => {
    confirm({
      title: `确认${actionText}该预约？`,
      okText: `确认${actionText}`,
      cancelText: '取消',
      onOk: async () => {
        try {
          const res = await appointmentAPI.updateStatus(id, { status })
          if (res.code === 200) {
            message.success(`预约${actionText}成功`)
            fetchData()
          }
        } catch (error) {
          console.error('操作失败:', error)
        }
      }
    })
  }

  const columns = [
    {
      title: '预约编号',
      dataIndex: 'id',
      key: 'id',
      width: 100
    },
    {
      title: '预约类型',
      dataIndex: 'service_type',
      key: 'service_type',
      width: 100,
      render: (type) => {
        const typeInfo = APPOINTMENT_TYPE_MAP[type] || { label: type, color: 'default' }
        return <Tag color={typeInfo.color}>{typeInfo.label}</Tag>
      }
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
      title: '日期时间',
      dataIndex: 'appointment_time',
      key: 'appointment_time',
      width: 180,
      render: (text) => text ? dayjs(text).format('YYYY-MM-DD HH:mm') : '-'
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status) => {
        const statusInfo = APPOINTMENT_STATUS_MAP[status] || { label: status, color: 'default' }
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
      width: 260,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/appointments/${record.id}`)}
          >
            查看详情
          </Button>
          {record.status === 'pending' && user?.role === 'therapist' && (
            <Button
              type="link"
              size="small"
              icon={<CheckOutlined />}
              onClick={() => handleStatusUpdate(record.id, 'confirmed', '确认')}
            >
              确认
            </Button>
          )}
          {record.status === 'confirmed' && user?.role === 'therapist' && (
            <Button
              type="link"
              size="small"
              icon={<CheckCircleOutlined />}
              onClick={() => handleStatusUpdate(record.id, 'completed', '完成')}
            >
              完成
            </Button>
          )}
          {record.status === 'pending' && user?.role === 'disabled' && (
            <Button
              type="link"
              size="small"
              danger
              icon={<CloseOutlined />}
              onClick={() => handleStatusUpdate(record.id, 'cancelled', '取消')}
            >
              取消
            </Button>
          )}
        </Space>
      )
    }
  ]

  const showCreateButton = user?.role === 'disabled' || user?.role === 'admin'

  return (
    <div>
      <div className="page-title">预约管理</div>

      <div className="toolbar">
        <Form
          form={form}
          layout="inline"
          onFinish={handleSearch}
          style={{ flexWrap: 'wrap', gap: 12 }}
        >
          <Form.Item name="status">
            <Select placeholder="状态" allowClear style={{ width: 140 }}>
              {Object.entries(APPOINTMENT_STATUS_MAP).map(([key, value]) => (
                <Option key={key} value={key}>{value.label}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="date">
            <DatePicker placeholder="选择日期" allowClear style={{ width: 180 }} />
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
          <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/appointments/new')}>
            创建预约
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

export default AppointmentList
