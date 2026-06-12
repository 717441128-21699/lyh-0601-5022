import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Table, Button, Space, Tag, Card, Modal, message, DatePicker } from 'antd'
import { EyeOutlined, PlusOutlined, FileTextOutlined } from '@ant-design/icons'
import { reportAPI } from '../../services/api'
import useUserStore from '../../store/useUserStore'
import dayjs from 'dayjs'

const { confirm } = Modal

const MonthlyReportList = () => {
  const navigate = useNavigate()
  const { user } = useUserStore()
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState([])
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0
  })
  const [generating, setGenerating] = useState(false)

  const fetchData = async (params = {}) => {
    setLoading(true)
    try {
      const res = await reportAPI.getMonthlyReports({
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
      console.error('获取月度报表列表失败:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [pagination.current, pagination.pageSize])

  const handleTableChange = (page, pageSize) => {
    setPagination(prev => ({ ...prev, current: page, pageSize }))
  }

  const handleGenerateReport = () => {
    confirm({
      title: '生成月度报表',
      content: (
        <div>
          <p>请选择要生成报表的月份：</p>
          <DatePicker
            picker="month"
            defaultValue={dayjs().subtract(1, 'month')}
            style={{ width: '100%' }}
            id="report-month-picker"
          />
        </div>
      ),
      okText: '生成报表',
      cancelText: '取消',
      onOk: async () => {
        const picker = document.getElementById('report-month-picker')
        let month = dayjs().subtract(1, 'month').format('YYYY-MM')
        try {
          const input = picker?.querySelector('input')
          if (input?.value) {
            month = dayjs(input.value).format('YYYY-MM')
          }
        } catch (e) {
          console.error(e)
        }
        
        setGenerating(true)
        try {
          const res = await reportAPI.generateMonthly({ month })
          if (res.code === 200) {
            message.success('报表生成成功')
            fetchData()
          }
        } catch (error) {
          console.error('生成报表失败:', error)
        } finally {
          setGenerating(false)
        }
      }
    })
  }

  const columns = [
    {
      title: '报表月份',
      dataIndex: 'month',
      key: 'month',
      width: 150,
      render: (text) => text ? dayjs(text + '-01').format('YYYY年MM月') : '-'
    },
    {
      title: '订单量',
      dataIndex: 'orderCount',
      key: 'orderCount',
      width: 120,
      render: (text) => text || 0
    },
    {
      title: '订单收入',
      dataIndex: 'orderIncome',
      key: 'orderIncome',
      width: 140,
      render: (text) => `¥${Number(text || 0).toLocaleString()}`
    },
    {
      title: '训练次数',
      dataIndex: 'trainingCount',
      key: 'trainingCount',
      width: 120,
      render: (text) => text || 0
    },
    {
      title: '训练收入',
      dataIndex: 'trainingIncome',
      key: 'trainingIncome',
      width: 140,
      render: (text) => `¥${Number(text || 0).toLocaleString()}`
    },
    {
      title: '总收入',
      dataIndex: 'totalIncome',
      key: 'totalIncome',
      width: 140,
      render: (text) => (
        <span style={{ color: '#52c41a', fontWeight: 600 }}>
          ¥{Number(text || 0).toLocaleString()}
        </span>
      )
    },
    {
      title: '新增用户',
      dataIndex: 'newUserCount',
      key: 'newUserCount',
      width: 120,
      render: (text) => text || 0
    },
    {
      title: '活跃用户',
      dataIndex: 'activeUserCount',
      key: 'activeUserCount',
      width: 120,
      render: (text) => text || 0
    },
    {
      title: '生成时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (text) => text ? dayjs(text).format('YYYY-MM-DD HH:mm') : '-'
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status) => {
        const statusMap = {
          completed: { label: '已完成', color: 'green' },
          generating: { label: '生成中', color: 'blue' },
          failed: { label: '失败', color: 'red' }
        }
        const info = statusMap[status] || { label: status, color: 'default' }
        return <Tag color={info.color}>{info.label}</Tag>
      }
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/reports/monthly/${record.month}`)}
          >
            查看详情
          </Button>
        </Space>
      )
    }
  ]

  const canGenerate = user?.role === 'admin' || user?.role === 'finance'

  return (
    <div>
      <div className="page-title">月度报表</div>

      <div className="toolbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <FileTextOutlined style={{ fontSize: 20, color: '#1890ff' }} />
          <span>共 {pagination.total} 份报表</span>
        </div>

        {canGenerate && (
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleGenerateReport}
            loading={generating}
          >
            手动生成报表
          </Button>
        )}
      </div>

      <div className="table-container">
        <Table
          columns={columns}
          dataSource={data}
          rowKey="month"
          loading={loading}
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条记录`,
            onChange: handleTableChange
          }}
          scroll={{ x: 1300 }}
        />
      </div>
    </div>
  )
}

export default MonthlyReportList
