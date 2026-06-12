import React, { useState, useEffect } from 'react'
import { Row, Col, Card, List, Tag, Spin } from 'antd'
import {
  FileTextOutlined,
  ShoppingCartOutlined,
  ScheduleOutlined,
  DollarOutlined,
  UserOutlined,
  TeamOutlined,
  BarChartOutlined,
  RiseOutlined
} from '@ant-design/icons'
import ReactECharts from 'echarts-for-react'
import dayjs from 'dayjs'
import { reportAPI } from '../services/api'
import useUserStore from '../store/useUserStore'
import { ROLE_MAP } from '../utils/constants'

const roleMetrics = {
  disabled: [
    { key: 'assessmentCount', label: '评估次数', icon: FileTextOutlined, color: '#1890ff' },
    { key: 'planCount', label: '方案数量', icon: BarChartOutlined, color: '#52c41a' },
    { key: 'orderCount', label: '订单数量', icon: ShoppingCartOutlined, color: '#faad14' },
    { key: 'trainingPlanCount', label: '训练计划数', icon: ScheduleOutlined, color: '#722ed1' }
  ],
  adapter: [
    { key: 'pendingAssessment', label: '待处理评估', icon: FileTextOutlined, color: '#faad14' },
    { key: 'planCount', label: '方案数量', icon: BarChartOutlined, color: '#52c41a' },
    { key: 'orderCount', label: '订单数量', icon: ShoppingCartOutlined, color: '#1890ff' },
    { key: 'monthlyIncome', label: '本月收入', icon: DollarOutlined, color: '#f5222d' }
  ],
  therapist: [
    { key: 'trainingPlanCount', label: '训练计划数', icon: ScheduleOutlined, color: '#722ed1' },
    { key: 'appointmentCount', label: '预约数量', icon: TeamOutlined, color: '#1890ff' },
    { key: 'trainingRecordCount', label: '训练记录数', icon: BarChartOutlined, color: '#52c41a' },
    { key: 'monthlyTraining', label: '本月训练', icon: RiseOutlined, color: '#faad14' }
  ],
  finance: [
    { key: 'monthlyIncome', label: '本月收入', icon: DollarOutlined, color: '#52c41a' },
    { key: 'orderIncome', label: '订单收入', icon: ShoppingCartOutlined, color: '#1890ff' },
    { key: 'trainingIncome', label: '训练收入', icon: ScheduleOutlined, color: '#722ed1' },
    { key: 'newUserCount', label: '新增用户', icon: UserOutlined, color: '#faad14' }
  ],
  admin: [
    { key: 'userTotal', label: '用户总数', icon: TeamOutlined, color: '#1890ff' },
    { key: 'orderTotal', label: '订单总数', icon: ShoppingCartOutlined, color: '#52c41a' },
    { key: 'trainingTotal', label: '训练总数', icon: ScheduleOutlined, color: '#722ed1' },
    { key: 'totalIncome', label: '总收入', icon: DollarOutlined, color: '#faad14' }
  ]
}

const roleWelcome = {
  disabled: '欢迎回来，祝您康复顺利！',
  adapter: '欢迎回来，今天也要努力工作哦！',
  therapist: '欢迎回来，帮助更多人康复吧！',
  finance: '欢迎回来，今天的账单都处理了吗？',
  admin: '欢迎回来，系统运行正常！'
}

const Dashboard = () => {
  const { user } = useUserStore()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(null)

  const role = user?.role || 'disabled'
  const metrics = roleMetrics[role] || roleMetrics.disabled
  const welcomeText = roleWelcome[role] || roleWelcome.disabled

  useEffect(() => {
    fetchDashboard()
  }, [])

  const fetchDashboard = async () => {
    try {
      setLoading(true)
      const res = await reportAPI.getDashboard()
      setData(res.data)
    } catch (error) {
      console.error('获取仪表盘数据失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const getTrendOption = () => {
    const trendData = data?.trendData || { dates: [], values: [] }
    return {
      tooltip: {
        trigger: 'axis'
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: trendData.dates
      },
      yAxis: {
        type: 'value'
      },
      series: [
        {
          name: '数量',
          type: 'line',
          smooth: true,
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(24, 144, 255, 0.3)' },
                { offset: 1, color: 'rgba(24, 144, 255, 0.05)' }
              ]
            }
          },
          lineStyle: {
            color: '#1890ff',
            width: 2
          },
          itemStyle: {
            color: '#1890ff'
          },
          data: trendData.values
        }
      ]
    }
  }

  const getDistributionOption = () => {
    const distData = data?.distributionData || []
    return {
      tooltip: {
        trigger: 'item',
        formatter: '{b}: {c} ({d}%)'
      },
      legend: {
        orient: 'vertical',
        right: '5%',
        top: 'center'
      },
      series: [
        {
          name: '分布',
          type: 'pie',
          radius: ['40%', '70%'],
          center: ['35%', '50%'],
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 10,
            borderColor: '#fff',
            borderWidth: 2
          },
          label: {
            show: false,
            position: 'center'
          },
          emphasis: {
            label: {
              show: true,
              fontSize: 20,
              fontWeight: 'bold'
            }
          },
          labelLine: {
            show: false
          },
          data: distData.map((item, index) => ({
            value: item.value,
            name: item.name,
            itemStyle: {
              color: ['#1890ff', '#52c41a', '#faad14', '#722ed1', '#f5222d', '#13c2c2'][index % 6]
            }
          }))
        }
      ]
    }
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin size="large" />
      </div>
    )
  }

  return (
    <div>
      <div className="welcome-banner">
        <h1>你好，{user?.name || user?.username || '用户'}</h1>
        <p>{welcomeText}</p>
        <p style={{ marginTop: 8, fontSize: 12 }}>
          <Tag color={ROLE_MAP[role]?.color || 'blue'}>{ROLE_MAP[role]?.label || '用户'}</Tag>
          {dayjs().format('YYYY年MM月DD日 dddd')}
        </p>
      </div>

      <Row gutter={[16, 16]} className="dashboard-grid">
        {metrics.map((metric, index) => {
          const IconComponent = metric.icon
          const value = data?.[metric.key] ?? 0
          return (
            <Col xs={12} sm={12} md={6} key={metric.key}>
              <Card className="stat-card" bordered={false}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: '50%',
                      background: `${metric.color}15`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <IconComponent style={{ fontSize: 24, color: metric.color }} />
                  </div>
                  <div style={{ textAlign: 'left' }}>
                    <div className="stat-value" style={{ color: metric.color, fontSize: 24 }}>
                      {typeof value === 'number' && value >= 10000
                        ? (value / 10000).toFixed(1) + '万'
                        : value}
                    </div>
                    <div className="stat-label">{metric.label}</div>
                  </div>
                </div>
              </Card>
            </Col>
          )
        })}
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} md={14}>
          <Card className="chart-card" bordered={false}>
            <div className="chart-title">趋势图</div>
            <ReactECharts option={getTrendOption()} style={{ height: 300 }} />
          </Card>
        </Col>
        <Col xs={24} md={10}>
          <Card className="chart-card" bordered={false}>
            <div className="chart-title">分布图</div>
            <ReactECharts option={getDistributionOption()} style={{ height: 300 }} />
          </Card>
        </Col>
      </Row>

      <Card className="chart-card" bordered={false}>
        <div className="chart-title">最近记录</div>
        <List
          dataSource={data?.recentRecords || []}
          renderItem={(item) => (
            <List.Item
              actions={[
                <Tag key="status" color={item.statusColor || 'blue'}>
                  {item.status}
                </Tag>
              ]}
            >
              <List.Item.Meta
                title={item.title}
                description={
                  <div>
                    <span style={{ marginRight: 16, color: '#999' }}>
                      {item.type || ''}
                    </span>
                    <span style={{ color: '#999' }}>
                      {dayjs(item.time).format('YYYY-MM-DD HH:mm')}
                    </span>
                  </div>
                }
              />
            </List.Item>
          )}
        />
      </Card>
    </div>
  )
}

export default Dashboard
