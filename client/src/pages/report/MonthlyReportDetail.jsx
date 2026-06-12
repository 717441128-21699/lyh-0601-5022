import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Button,
  Card,
  Row,
  Col,
  Statistic,
  Space,
  Spin,
  Tag,
  Descriptions
} from 'antd'
import {
  ArrowLeftOutlined,
  ShoppingCartOutlined,
  ScheduleOutlined,
  DollarOutlined,
  UserOutlined,
  TeamOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  RiseOutlined,
  PieChartOutlined
} from '@ant-design/icons'
import ReactECharts from 'echarts-for-react'
import dayjs from 'dayjs'
import { reportAPI } from '../../services/api'
import useUserStore from '../../store/useUserStore'

const MonthlyReportDetail = () => {
  const { month } = useParams()
  const navigate = useNavigate()
  const { user } = useUserStore()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(null)

  useEffect(() => {
    fetchReport()
  }, [month])

  const fetchReport = async () => {
    setLoading(true)
    try {
      const res = await reportAPI.getMonthlyReport(month)
      if (res.code === 200) {
        setData(res.data)
      }
    } catch (error) {
      console.error('获取月度报表详情失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const getTrendOption = () => {
    const trendData = data?.dailyTrend || { dates: [], income: [], orders: [] }
    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'cross'
        }
      },
      legend: {
        data: ['收入', '订单量'],
        top: 0
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        top: 40,
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: trendData.dates,
        axisPointer: {
          type: 'shadow'
        }
      },
      yAxis: [
        {
          type: 'value',
          name: '收入',
          axisLabel: {
            formatter: '¥{value}'
          }
        },
        {
          type: 'value',
          name: '订单量'
        }
      ],
      series: [
        {
          name: '收入',
          type: 'bar',
          data: trendData.income,
          itemStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: '#1890ff' },
                { offset: 1, color: '#69c0ff' }
              ]
            },
            borderRadius: [4, 4, 0, 0]
          }
        },
        {
          name: '订单量',
          type: 'line',
          yAxisIndex: 1,
          smooth: true,
          data: trendData.orders,
          lineStyle: {
            color: '#52c41a',
            width: 2
          },
          itemStyle: {
            color: '#52c41a'
          },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(82, 196, 26, 0.3)' },
                { offset: 1, color: 'rgba(82, 196, 26, 0.05)' }
              ]
            }
          }
        }
      ]
    }
  }

  const getIncomeDistributionOption = () => {
    const distData = data?.incomeDistribution || []
    return {
      tooltip: {
        trigger: 'item',
        formatter: '{b}: ¥{c} ({d}%)'
      },
      legend: {
        orient: 'vertical',
        right: '5%',
        top: 'center'
      },
      series: [
        {
          name: '收入构成',
          type: 'pie',
          radius: ['45%', '75%'],
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
              fontSize: 18,
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
              color: ['#1890ff', '#52c41a', '#722ed1', '#faad14', '#13c2c2'][index % 5]
            }
          }))
        }
      ]
    }
  }

  const getUserGrowthOption = () => {
    const growthData = data?.userGrowth || { dates: [], newUsers: [], activeUsers: [] }
    return {
      tooltip: {
        trigger: 'axis'
      },
      legend: {
        data: ['新增用户', '活跃用户'],
        top: 0
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        top: 40,
        containLabel: true
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: growthData.dates
      },
      yAxis: {
        type: 'value'
      },
      series: [
        {
          name: '新增用户',
          type: 'line',
          smooth: true,
          stack: 'Total',
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(114, 46, 209, 0.3)' },
                { offset: 1, color: 'rgba(114, 46, 209, 0.05)' }
              ]
            }
          },
          lineStyle: {
            color: '#722ed1',
            width: 2
          },
          itemStyle: {
            color: '#722ed1'
          },
          data: growthData.newUsers
        },
        {
          name: '活跃用户',
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
          data: growthData.activeUsers
        }
      ]
    }
  }

  const formatChange = (value, type = 'number') => {
    if (value === undefined || value === null) return '-'
    const isPositive = value >= 0
    const icon = isPositive ? <ArrowUpOutlined /> : <ArrowDownOutlined />
    const color = isPositive ? '#52c41a' : '#f5222d'
    const displayValue = type === 'percent' 
      ? `${Math.abs(value).toFixed(2)}%`
      : Math.abs(value).toLocaleString()
    return (
      <span style={{ color, marginLeft: 8 }}>
        {icon} {displayValue}
      </span>
    )
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin size="large" />
      </div>
    )
  }

  const statCards = [
    {
      title: '订单量',
      value: data?.orderCount || 0,
      change: data?.orderCountChange,
      icon: <ShoppingCartOutlined />,
      color: '#1890ff'
    },
    {
      title: '订单收入',
      value: data?.orderIncome || 0,
      change: data?.orderIncomeChange,
      prefix: '¥',
      icon: <DollarOutlined />,
      color: '#52c41a'
    },
    {
      title: '训练次数',
      value: data?.trainingCount || 0,
      change: data?.trainingCountChange,
      icon: <ScheduleOutlined />,
      color: '#722ed1'
    },
    {
      title: '训练收入',
      value: data?.trainingIncome || 0,
      change: data?.trainingIncomeChange,
      prefix: '¥',
      icon: <DollarOutlined />,
      color: '#faad14'
    },
    {
      title: '总收入',
      value: data?.totalIncome || 0,
      change: data?.totalIncomeChange,
      prefix: '¥',
      icon: <RiseOutlined />,
      color: '#f5222d'
    },
    {
      title: '新增用户',
      value: data?.newUserCount || 0,
      change: data?.newUserCountChange,
      icon: <UserOutlined />,
      color: '#13c2c2'
    },
    {
      title: '活跃用户',
      value: data?.activeUserCount || 0,
      change: data?.activeUserCountChange,
      icon: <TeamOutlined />,
      color: '#eb2f96'
    }
  ]

  return (
    <div>
      <Button
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate('/reports')}
        style={{ marginBottom: 20 }}
      >
        返回列表
      </Button>

      <div className="page-title">
        <Space>
          月度报表详情
          <Tag color="blue">
            {month ? dayjs(month + '-01').format('YYYY年MM月') : '-'}
          </Tag>
        </Space>
      </div>

      <Card className="detail-card">
        <div className="detail-title">核心数据指标（环比）</div>
        <Row gutter={[16, 16]}>
          {statCards.map((stat, index) => (
            <Col xs={24} sm={12} md={8} lg={6} key={index}>
              <Card size="small" bordered={false} style={{ background: '#fafafa' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: '50%',
                      background: `${stat.color}15`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    {React.cloneElement(stat.icon, { style: { fontSize: 18, color: stat.color } })}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>
                      {stat.title}
                    </div>
                    <div style={{ fontSize: 20, fontWeight: 600, color: '#333' }}>
                      {stat.prefix || ''}
                      {typeof stat.value === 'number' && stat.value >= 10000
                        ? (stat.value / 10000).toFixed(2) + '万'
                        : Number(stat.value).toLocaleString()}
                    </div>
                    {stat.change !== undefined && stat.change !== null && (
                      <div style={{ fontSize: 12 }}>
                        {formatChange(stat.change, 'percent')}
                        <span style={{ color: '#999', marginLeft: 4 }}>环比</span>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      </Card>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} md={14}>
          <Card className="chart-card" bordered={false}>
            <div className="chart-title">
              <Space>
                <RiseOutlined />
                每日收入与订单趋势
              </Space>
            </div>
            <ReactECharts option={getTrendOption()} style={{ height: 320 }} />
          </Card>
        </Col>
        <Col xs={24} md={10}>
          <Card className="chart-card" bordered={false}>
            <div className="chart-title">
              <Space>
                <PieChartOutlined />
                收入构成分布
              </Space>
            </div>
            <ReactECharts option={getIncomeDistributionOption()} style={{ height: 320 }} />
          </Card>
        </Col>
      </Row>

      <Card className="chart-card" bordered={false}>
        <div className="chart-title">
          <Space>
            <TeamOutlined />
            用户增长趋势
          </Space>
        </div>
        <ReactECharts option={getUserGrowthOption()} style={{ height: 300 }} />
      </Card>

      {data?.summary && (
        <Card className="detail-card" style={{ marginTop: 16 }}>
          <div className="detail-title">报表摘要</div>
          <Descriptions column={1} size="small">
            <Descriptions.Item label="报表说明">
              {data.summary || '本月各项业务数据平稳增长，收入结构持续优化。'}
            </Descriptions.Item>
          </Descriptions>
        </Card>
      )}
    </div>
  )
}

export default MonthlyReportDetail
