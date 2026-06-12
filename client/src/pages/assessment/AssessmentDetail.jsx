import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Button, Card, Tag, Descriptions, Form, Input, Select, message, Space, Divider, Row, Col } from 'antd'
import { ArrowLeftOutlined, EditOutlined, CheckOutlined, FileTextOutlined } from '@ant-design/icons'
import { assessmentAPI } from '../../services/api'
import useUserStore from '../../store/useUserStore'
import { ASSESSMENT_STATUS_MAP } from '../../utils/constants'
import dayjs from 'dayjs'

const { TextArea } = Input
const { Option } = Select

const AssessmentDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useUserStore()
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [detail, setDetail] = useState(null)
  const [recommendation, setRecommendation] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const fetchDetail = async () => {
    setLoading(true)
    try {
      const res = await assessmentAPI.getAssessmentDetail(id)
      if (res.code === 200) {
        setDetail(res.data)
      }
    } catch (error) {
      console.error('获取评估详情失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchRecommendation = async () => {
    try {
      const res = await assessmentAPI.getRecommendation(id)
      if (res.code === 200) {
        setRecommendation(res.data)
      }
    } catch (error) {
      console.error('获取推荐结果失败:', error)
    }
  }

  useEffect(() => {
    fetchDetail()
    fetchRecommendation()
  }, [id])

  const handleHomeAssessmentSubmit = async (values) => {
    setSubmitting(true)
    try {
      const res = await assessmentAPI.homeAssessment(id, values)
      if (res.code === 200) {
        message.success('上门评估录入成功')
        fetchDetail()
      }
    } catch (error) {
      console.error('上门评估录入失败:', error)
    } finally {
      setSubmitting(false)
    }
  }

  const getScoreColor = (score) => {
    if (score >= 90) return '#52c41a'
    if (score >= 70) return '#1890ff'
    if (score >= 60) return '#faad14'
    return '#ff4d4f'
  }

  const statusInfo = detail ? (ASSESSMENT_STATUS_MAP[detail.status] || { label: detail.status, color: 'default' }) : { label: '-', color: 'default' }

  const typeMap = {
    online: { label: '在线评估', color: 'blue' },
    home: { label: '上门评估', color: 'green' }
  }

  const mockRecommendation = {
    overallScore: 85,
    devices: [
      { id: 1, name: '智能轮椅 Pro', matchScore: 95, description: '电动智能轮椅，支持语音控制和自动导航', price: 12800, category: '轮椅' },
      { id: 2, name: '助行器', matchScore: 88, description: '轻便折叠助行器，高度可调节', price: 680, category: '助行器具' },
      { id: 3, name: '坐姿矫正坐垫', matchScore: 76, description: '记忆棉材质，有效改善坐姿', price: 299, category: '康复辅具' }
    ]
  }

  const displayRecommendation = recommendation || mockRecommendation

  return (
    <div>
      <Button
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate('/assessments')}
        style={{ marginBottom: 20 }}
      >
        返回列表
      </Button>

      <div className="page-title">
        <Space>
          评估详情
          <Tag color={statusInfo.color}>{statusInfo.label}</Tag>
        </Space>
      </div>

      <Card loading={loading} className="detail-card">
        <div className="detail-title">基本信息</div>
        <Descriptions column={2} bordered size="small">
          <Descriptions.Item label="评估编号">{detail?.id || '-'}</Descriptions.Item>
          <Descriptions.Item label="评估类型">
            <Tag color={typeMap[detail?.type]?.color || 'default'}>
              {typeMap[detail?.type]?.label || detail?.type || '-'}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="用户姓名">{detail?.userName || '-'}</Descriptions.Item>
          <Descriptions.Item label="联系电话">{detail?.phone || '-'}</Descriptions.Item>
          <Descriptions.Item label="残疾类型">{detail?.disabilityType || '-'}</Descriptions.Item>
          <Descriptions.Item label="残疾等级">{detail?.disabilityLevel || '-'}</Descriptions.Item>
          <Descriptions.Item label="身高">{detail?.height ? `${detail.height} cm` : '-'}</Descriptions.Item>
          <Descriptions.Item label="体重">{detail?.weight ? `${detail.weight} kg` : '-'}</Descriptions.Item>
          <Descriptions.Item label="年龄">{detail?.age ? `${detail.age} 岁` : '-'}</Descriptions.Item>
          <Descriptions.Item label="性别">{detail?.gender === 'male' ? '男' : detail?.gender === 'female' ? '女' : '-'}</Descriptions.Item>
          <Descriptions.Item label="创建时间" span={2}>
            {detail?.createdAt ? dayjs(detail.createdAt).format('YYYY-MM-DD HH:mm:ss') : '-'}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card className="detail-card">
        <div className="detail-title">评估详情</div>
        <Row gutter={24}>
          <Col span={12}>
            <div className="detail-item">
              <div className="detail-label">日常需求</div>
              <div className="detail-value">{detail?.dailyNeeds || '-'}</div>
            </div>
          </Col>
          <Col span={12}>
            <div className="detail-item">
              <div className="detail-label">病史</div>
              <div className="detail-value">{detail?.medicalHistory || '-'}</div>
            </div>
          </Col>
          <Col span={24}>
            <div className="detail-item">
              <div className="detail-label">居住环境</div>
              <div className="detail-value">{detail?.livingEnvironment || '-'}</div>
            </div>
          </Col>
        </Row>
      </Card>

      <Card className="detail-card" title="推荐结果" extra={<FileTextOutlined style={{ color: '#1890ff' }} />}>
        <div style={{ marginBottom: 20, padding: '16px 0' }}>
          <Space align="center" size="large">
            <div>
              <span style={{ color: '#666', marginRight: 8 }}>综合匹配度：</span>
              <span style={{ fontSize: 32, fontWeight: 'bold', color: getScoreColor(displayRecommendation.overallScore) }}>
                {displayRecommendation.overallScore}
              </span>
              <span style={{ fontSize: 16, color: '#666' }}> 分</span>
            </div>
            <div style={{ color: '#666' }}>
              共推荐 <span style={{ color: '#1890ff', fontWeight: 600 }}>{displayRecommendation.devices?.length || 0}</span> 款器具
            </div>
          </Space>
        </div>

        <Divider style={{ margin: '12px 0' }} />

        {displayRecommendation.devices?.map((device) => (
          <div key={device.id} className="recommendation-item">
            <div className="recommendation-score" style={{ background: `linear-gradient(135deg, ${getScoreColor(device.matchScore)}, #1890ff)` }}>
              {device.matchScore}%
            </div>
            <div className="recommendation-info">
              <div className="recommendation-name">
                <Space>
                  {device.name}
                  <Tag color="blue">{device.category}</Tag>
                </Space>
              </div>
              <div className="recommendation-desc">{device.description}</div>
            </div>
            <div className="recommendation-price">¥{device.price?.toLocaleString()}</div>
          </div>
        ))}

        <Divider />

        <div style={{ textAlign: 'right' }}>
          <span style={{ color: '#666', marginRight: 12 }}>预计总费用：</span>
          <span style={{ fontSize: 24, fontWeight: 'bold', color: '#f5222d' }}>
            ¥{displayRecommendation.devices?.reduce((sum, d) => sum + (d.price || 0), 0).toLocaleString()}
          </span>
        </div>
      </Card>

      {user?.role === 'adapter' && detail?.status === 'pending' && (
        <Card className="detail-card" title="上门评估录入">
          <Form
            form={form}
            layout="vertical"
            onFinish={handleHomeAssessmentSubmit}
          >
            <Form.Item
              label="评估结论"
              name="conclusion"
              rules={[{ required: true, message: '请填写评估结论' }]}
            >
              <TextArea rows={3} placeholder="请填写上门评估结论..." showCount maxLength={500} />
            </Form.Item>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  label="运动能力评估"
                  name="mobilityAssessment"
                  rules={[{ required: true, message: '请选择运动能力评估' }]}
                >
                  <Select placeholder="请选择">
                    <Option value="normal">正常</Option>
                    <Option value="mild">轻度受限</Option>
                    <Option value="moderate">中度受限</Option>
                    <Option value="severe">重度受限</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="生活自理能力"
                  name="selfCareAbility"
                  rules={[{ required: true, message: '请选择生活自理能力' }]}
                >
                  <Select placeholder="请选择">
                    <Option value="independent">完全自理</Option>
                    <Option value="partial">部分需要协助</Option>
                    <Option value="dependent">完全依赖</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Form.Item
              label="环境评估"
              name="environmentAssessment"
            >
              <TextArea rows={2} placeholder="请描述居住环境评估结果..." showCount maxLength={300} />
            </Form.Item>

            <Form.Item
              label="备注"
              name="remark"
            >
              <TextArea rows={2} placeholder="其他备注信息..." showCount maxLength={200} />
            </Form.Item>

            <Form.Item style={{ marginBottom: 0 }}>
              <Space>
                <Button type="primary" htmlType="submit" loading={submitting} icon={<CheckOutlined />}>
                  提交评估
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Card>
      )}

      {user?.role === 'disabled' && detail?.status === 'completed' && (
        <div style={{ textAlign: 'center', padding: 24 }}>
          <Button type="primary" size="large" onClick={() => navigate(`/plans/create?assessmentId=${id}`)}>
            生成适配方案
          </Button>
        </div>
      )}
    </div>
  )
}

export default AssessmentDetail
