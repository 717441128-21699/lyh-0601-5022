import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Button,
  Card,
  Descriptions,
  Space,
  Progress,
  Row,
  Col,
  List,
  Tag,
  Statistic,
  Empty,
  Alert
} from 'antd'
import {
  ArrowLeftOutlined,
  ThunderboltOutlined,
  RiseOutlined,
  FallOutlined
} from '@ant-design/icons'
import { trainingAPI } from '../../services/api'
import useUserStore from '../../store/useUserStore'
import dayjs from 'dayjs'

const TrainingRecordDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useUserStore()
  const [loading, setLoading] = useState(false)
  const [detail, setDetail] = useState(null)

  const fetchDetail = async () => {
    setLoading(true)
    try {
      const res = await trainingAPI.getRecordDetail(id)
      if (res.code === 200) {
        setDetail(res.data)
      }
    } catch (error) {
      console.error('获取训练记录详情失败:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDetail()
  }, [id])

  const items = detail?.actual_exercises || detail?.exercises || []

  const intensityAdjustment = detail ? (detail.next_intensity || detail.current_intensity) - (detail.current_intensity || 0) : 0
  const frequencyAdjustment = detail ? (detail.next_frequency || detail.current_frequency) - (detail.current_frequency || 0) : 0
  const nextIntensity = detail?.next_intensity || detail?.current_intensity || 0
  const nextFrequency = detail?.next_frequency || detail?.current_frequency || 0

  const getAdjustIcon = (val) => {
    if (val > 0) return <RiseOutlined style={{ color: '#52c41a' }} />
    if (val < 0) return <FallOutlined style={{ color: '#ff4d4f' }} />
    return null
  }

  const getAdjustColor = (val) => {
    if (val > 0) return '#52c41a'
    if (val < 0) return '#ff4d4f'
    return '#999'
  }

  return (
    <div>
      <Button
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate(-1)}
        style={{ marginBottom: 20 }}
      >
        返回
      </Button>

      <div className="page-title">训练记录详情</div>

      <Card loading={loading} className="detail-card">
        <div className="detail-title">训练基本信息</div>
        <Descriptions column={2} bordered size="small">
          <Descriptions.Item label="关联计划">
            {detail?.plan_name || detail?.plan_id ? (
              <Button type="link" onClick={() => navigate(`/training/${detail.plan_id}`)}>
                {detail.plan_name || `#${detail.plan_id}`}
              </Button>
            ) : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="训练日期">
            {detail?.training_date ? dayjs(detail.training_date).format('YYYY-MM-DD') : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="训练时长">
            {detail?.duration ? `${detail.duration}分钟` : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="训练强度">
            {detail?.current_intensity ? `${detail.current_intensity}/10` : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="完成度" span={2}>
            <Progress
              percent={detail?.completion_rate || 0}
              status={detail?.completion_rate >= 80 ? 'success' : detail?.completion_rate >= 50 ? 'active' : 'exception'}
              strokeColor={{
                '0%': '#108ee9',
                '100%': '#87d068',
              }}
            />
          </Descriptions.Item>
          <Descriptions.Item label="记录时间" span={2}>
            {detail?.created_at ? dayjs(detail.created_at).format('YYYY-MM-DD HH:mm:ss') : '-'}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      {(intensityAdjustment !== 0 || frequencyAdjustment !== 0 || detail?.adjustment_reason) && (
        <Card className="detail-card">
          <div className="detail-title">
            <Space>
              <ThunderboltOutlined style={{ color: '#faad14' }} />
              强度调整说明
            </Space>
          </div>
          
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={12}>
              <Card size="small">
                <Row align="middle" justify="space-between">
                  <div>
                    <div style={{ color: '#666', fontSize: 13 }}>下一次强度</div>
                    <div style={{ fontSize: 24, fontWeight: 'bold', color: '#1890ff' }}>
                      {nextIntensity}/10
                    </div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    {getAdjustIcon(intensityAdjustment)}
                    <div style={{ color: getAdjustColor(intensityAdjustment), fontSize: 14, fontWeight: 500 }}>
                      {intensityAdjustment > 0 ? `+${intensityAdjustment}` : intensityAdjustment}级
                    </div>
                  </div>
                </Row>
              </Card>
            </Col>
            <Col span={12}>
              <Card size="small">
                <Row align="middle" justify="space-between">
                  <div>
                    <div style={{ color: '#666', fontSize: 13 }}>下一次频率</div>
                    <div style={{ fontSize: 24, fontWeight: 'bold', color: '#52c41a' }}>
                      {nextFrequency}次/周
                    </div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    {getAdjustIcon(frequencyAdjustment)}
                    <div style={{ color: getAdjustColor(frequencyAdjustment), fontSize: 14, fontWeight: 500 }}>
                      {frequencyAdjustment > 0 ? `+${frequencyAdjustment}` : frequencyAdjustment}次
                    </div>
                  </div>
                </Row>
              </Card>
            </Col>
          </Row>

          {detail?.adjustment_reason && (
            <Alert
              message="调整原因"
              description={detail.adjustment_reason}
              type="info"
              showIcon
            />
          )}
        </Card>
      )}

      <Card className="detail-card" title="训练项目">
        {items.length > 0 ? (
          <List
            dataSource={items}
            renderItem={(item, index) => (
              <List.Item key={item.id || index}>
                <Row gutter={16} style={{ width: '100%' }} align="middle">
                  <Col span={8}>
                    <Space>
                      <Tag color="blue">项目 {index + 1}</Tag>
                      <span style={{ fontWeight: 500 }}>{item.name}</span>
                    </Space>
                  </Col>
                  <Col span={4}>
                    <span style={{ color: '#666' }}>组数：</span>
                    <span>{item.sets || 0}</span>
                  </Col>
                  <Col span={4}>
                    <span style={{ color: '#666' }}>次数：</span>
                    <span>{item.reps || 0}</span>
                  </Col>
                  <Col span={4}>
                    <span style={{ color: '#666' }}>重量：</span>
                    <span>{item.weight || 0} kg</span>
                  </Col>
                  <Col span={4} style={{ textAlign: 'right' }}>
                    <Tag color="green">
                      {(item.sets || 0) * (item.reps || 0)} 次总次数
                    </Tag>
                  </Col>
                </Row>
              </List.Item>
            )}
          />
        ) : (
          <Empty description="暂无训练项目" />
        )}
      </Card>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={12}>
          <Card className="detail-card">
            <div className="detail-title">训练备注</div>
            <div style={{ color: '#333', lineHeight: 1.8, minHeight: 60 }}>
              {detail?.notes || '-'}
            </div>
          </Card>
        </Col>
        <Col span={12}>
          <Card className="detail-card">
            <div className="detail-title">用户反馈</div>
            <div style={{ color: '#333', lineHeight: 1.8, minHeight: 60 }}>
              {detail?.feedback || '-'}
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  )
}

export default TrainingRecordDetail
