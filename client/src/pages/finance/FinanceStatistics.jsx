import React, { useState, useEffect } from 'react'
import { Row, Col, Card, Statistic, DatePicker, Select, Space, Spin } from 'antd'
import {
  DollarOutlined,
  ArrowUpOutlined,
  ShoppingCartOutlined,
  ScheduleOutlined,
  RiseOutlined,
  PieChartOutlined
} from '@ant-design/icons'
import ReactECharts from 'echarts-for-react'
import dayjs from 'dayjs'
import { financeAPI } from '../../services/api'
import useUserStore from '../../store/useUserStore'

const { Option } = Select

const FinanceStatistics = () => {
  const { user } = useUserStore()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(null)
  const [period, setPeriod] = useState('month')
  const [selectedDate, setSelectedDate] = useState(dayjs())

  useEffect(() => {
    fetchStatistics()
  }, [period, selectedDate])

  const fetchStatistics = async () => {
    setLoading(true)
    try {
      const res = await financeAPI.getStatistics({
        period,
        date: selectedDate.format('YYYY-MM')
      })
      if (res.code === 200) {
        setData(res.data)
      }
    } catch (error) {
      console.error('获取财务统计失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const getTrendOption = () => {
    const trendData = data?.trendData || { dates: [], income: [], expense: [] }
    return {
      tooltip: {
        trigger: 'axis'
      },
      legend: {
        data: ['收入', '支出'],
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
        data: trendData.dates
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          formatter: '¥{value}'
        }
      },
      series: [
        {
          name: '收入',
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
                { offset: 0, color: 'rgba(82, 196, 26, 0.3)' },
                { offset: 1, color: 'rgba(82, 196, 26, 0.05)' }
              ]
            }
          },
          lineStyle: {
            color: '#52c41a',
            width: 2
          },
          itemStyle: {
            color: '#52c41a'
          },
          data: trendData.income
        },
        {
          name: '支出',
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
                { offset: 0, color: 'rgba(245, 34, 45, 0.3)' },
                { offset: 1, color: 'rgba(245, 34, 45, 0.05)' }
              ]
            }
          },
          lineStyle: {
            color: '#f5222d',
            width: 2
          },
          itemStyle: {
            color: '#f5222d'
          },
          data: trendData.expense
        }
      ]
    }
  }

  const getPieOption = () => {
    const pieData = data?.categoryData || []
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
          name: '收入类型',
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
          data: pieData.map((item, index) => ({
            value: item.value,
            name: item.name,
            itemStyle: {
              color: ['#52c41a', '#1890ff', '#722ed1', '#faad14', '#13c2c2', '#eb2f96'][index % 6]
            }
          }))
        }
      ]
    }
  }

  const statsCards = [
    {
      title: '总收入',
      value: data?.totalIncome || 0,
      prefix: <DollarOutlined />,
      color: '#52c41a',
      suffix: '元'
    },
    {
      title: '订单收入',
      value: data?.orderIncome || 0,
      prefix: <ShoppingCartOutlined />,
      color: '#1890ff',
      suffix: '元'
    },
    {
      title: '训练收入',
      value: data?.trainingIncome || 0,
      prefix: <ScheduleOutlined />,
      color: '#722ed1',
      suffix: '元'
    },
    {
      title: '环比增长',
      value: data?.growthRate || 0,
      prefix: <RiseOutlined />,
      color: '#faad14',
      suffix: '%'
    }
  ]

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin size="large" />
      </div>
    )
  }

  return (
    <div>
      <div className="page-title">
        <Space>
          财务统计
          <Select
            value={period}
            onChange={setPeriod}
            style={{ width: 120 }}
          >
            <Option value="week">本周</Option>
            <Option value="month">本月</Option>
            <Option value="quarter">本季度</Option>
            <Option value="year">本年</Option>
          </Select>
          {period === 'month' && (
            <DatePicker
              picker="month"
              value={selectedDate}
              onChange={setSelectedDate}
              allowClear={false}
            />
          )}
        </Space>
      </div>

      <Row gutter={[16, 16]} className="dashboard-grid">
        {statsCards.map((stat, index) => (
          <Col xs={12} sm={12} md={6} key={index}>
            <Card className="stat-card" bordered={false}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: '50%',
                    background: `${stat.color}15`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  {React.cloneElement(stat.prefix, { style: { fontSize: 24, color: stat.color } })}
                </div>
                <div style={{ textAlign: 'left' }}>
                  <div className="stat-value" style={{ color: stat.color, fontSize: 24 }}>
                    {typeof stat.value === 'number' && stat.value >= 10000
                      ? (stat.value / 10000).toFixed(2) + '万'
                      : Number(stat.value).toFixed(2)}
                    <span style={{ fontSize: 14, fontWeight: 400 }}> {stat.suffix}</span>
                  </div>
                  <div className="stat-label">{stat.title}</div>
                </div>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} md={14}>
          <Card className="chart-card" bordered={false}>
            <div className="chart-title">
              <Space>
                <RiseOutlined />
                收入支出趋势
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
                收入类型分布
              </Space>
            </div>
            <ReactECharts option={getPieOption()} style={{ height: 320 }} />
          </Card>
        </Col>
      </Row>

      <Card className="chart-card" bordered={false}>
        <div className="chart-title">收入概览</div>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={8}>
            <Card size="small" style={{ textAlign: 'center' }}>
              <Statistic
                title="订单数量"
                value={data?.orderCount || 0}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card size="small" style={{ textAlign: 'center' }}>
              <Statistic
                title="训练次数"
                value={data?.trainingCount || 0}
                valueStyle={{ color: '#722ed1' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card size="small" style={{ textAlign: 'center' }}>
              <Statistic
                title="平均客单价"
                value={data?.avgOrderValue || 0}
                precision={2}
                valueStyle={{ color: '#52c41a' }}
                prefix="¥"
              />
            </Card>
          </Col>
        </Row>
      </Card>
    </div>
  )
}

export default FinanceStatistics
