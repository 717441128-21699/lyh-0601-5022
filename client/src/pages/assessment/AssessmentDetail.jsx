import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Button, Card, Tag, Descriptions, Form, Input, Select, message, Space, Divider, Row, Col, Progress } from 'antd'
import { ArrowLeftOutlined, EditOutlined, CheckOutlined, FileTextOutlined, PlusOutlined } from '@ant-design/icons'
import { assessmentAPI, planAPI } from '../../services/api'
import useUserStore from '../../store/useUserStore'
import { ASSESSMENT_STATUS_MAP, DISABILITY_TYPES, DISABILITY_LEVELS } from '../../utils/constants'
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
        if (res.data.recommendation_result) {
          setRecommendation(res.data.recommendation_result)
        }
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
      const bodyData = detail?.body_data || {}
      const submitData = {
        disability_type: values.disability_type || detail?.disability_type,
        disability_level: values.disability_level || detail?.disability_level,
        body_data: {
          ...bodyData,
          height: values.height || bodyData.height,
          weight: values.weight || bodyData.weight,
          age: values.age || bodyData.age,
          gender: values.gender || bodyData.gender
        },
        daily_needs: values.daily_needs || detail?.daily_needs,
        living_environment: values.living_environment || detail?.living_environment,
        medical_history: values.medical_history || detail?.medical_history,
        evaluation_details: values.evaluation_details
      }
      const res = await assessmentAPI.homeAssessment(id, submitData)
      if (res.code === 200) {
        message.success('上门评估录入成功')
        setRecommendation(res.data?.recommendation)
        fetchDetail()
      }
    } catch (error) {
      console.error('上门评估录入失败:', error)
    } finally {
      setSubmitting(false)
    }
  }

  const handleCreatePlan = async () => {
    try {
      const planData = {
        assessment_id: parseInt(id),
        plan_name: `${detail?.user_name || '用户'}的适配方案`,
        plan_description: `基于评估 #${id} 生成的适配方案`,
        devices: recommendation?.recommendations?.map(item => ({
          device_id: item.device.id,
          device_name: item.device.name,
          quantity: 1,
          unit_price: item.device.price,
          subtotal: item.device.price
        })) || [],
        usage_instructions: '请严格按照使用说明操作，定期检查设备状态',
        precautions: '使用过程中如有不适请立即停止并咨询专业人士',
        estimated_effect: '预计可有效改善日常活动能力，提高生活质量'
      }
      const res = await planAPI.createPlan(planData)
      if (res.code === 200) {
        message.success('适配方案创建成功')
        navigate(`/plans/${res.data.id}`)
      }
    } catch (error) {
      console.error('创建方案失败:', error)
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

  const recommendationDevices = recommendation?.recommendations?.map((item, index) => ({
    id: item.device?.id,
    name: item.device?.name,
    matchScore: item.score,
    description: item.device?.description,
    price: item.device?.price,
    category: item.device?.category,
    brand: item.device?.brand
  })) || []

  const bodyData = detail?.body_data || {}

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
            <Tag color={typeMap[detail?.assessment_type]?.color || 'default'}>
              {typeMap[detail?.assessment_type]?.label || detail?.assessment_type || '-'}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="用户姓名">{detail?.user_name || '-'}</Descriptions.Item>
          <Descriptions.Item label="联系电话">{detail?.user_phone || '-'}</Descriptions.Item>
          <Descriptions.Item label="残疾类型">{detail?.disability_type || '-'}</Descriptions.Item>
          <Descriptions.Item label="残疾等级">{detail?.disability_level || '-'}</Descriptions.Item>
          <Descriptions.Item label="身高">{bodyData.height ? `${bodyData.height} cm` : '-'}</Descriptions.Item>
          <Descriptions.Item label="体重">{bodyData.weight ? `${bodyData.weight} kg` : '-'}</Descriptions.Item>
          <Descriptions.Item label="年龄">{bodyData.age ? `${bodyData.age} 岁` : '-'}</Descriptions.Item>
          <Descriptions.Item label="性别">{bodyData.gender === 'male' ? '男' : bodyData.gender === 'female' ? '女' : '-'}</Descriptions.Item>
          <Descriptions.Item label="适配师">{detail?.adapter_name || '-'}</Descriptions.Item>
          <Descriptions.Item label="评估时间">
            {detail?.assessment_time ? dayjs(detail.assessment_time).format('YYYY-MM-DD HH:mm:ss') : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="创建时间" span={2}>
            {detail?.created_at ? dayjs(detail.created_at).format('YYYY-MM-DD HH:mm:ss') : '-'}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card className="detail-card">
        <div className="detail-title">评估详情</div>
        <Row gutter={24}>
          <Col span={12}>
            <div className="detail-item">
              <div className="detail-label">日常需求</div>
              <div className="detail-value">{detail?.daily_needs || '-'}</div>
            </div>
          </Col>
          <Col span={12}>
            <div className="detail-item">
              <div className="detail-label">病史</div>
              <div className="detail-value">{detail?.medical_history || '-'}</div>
            </div>
          </Col>
          <Col span={24}>
            <div className="detail-item">
              <div className="detail-label">居住环境</div>
              <div className="detail-value">{detail?.living_environment || '-'}</div>
            </div>
          </Col>
          {detail?.evaluation_details && (
            <Col span={24}>
              <div className="detail-item">
                <div className="detail-label">评估详情</div>
                <div className="detail-value">{detail.evaluation_details}</div>
              </div>
            </Col>
          )}
        </Row>
      </Card>

      {recommendation && recommendationDevices.length > 0 && (
        <Card className="detail-card" title="智能推荐结果" extra={<FileTextOutlined style={{ color: '#1890ff' }} />}>
          <div style={{ marginBottom: 20, padding: '16px 0' }}>
            <Space align="center" size="large">
              <div>
                <span style={{ color: '#666', marginRight: 8 }}>最高匹配度：</span>
                <span style={{ fontSize: 32, fontWeight: 'bold', color: getScoreColor(recommendationDevices[0]?.matchScore || 0) }}>
                  {recommendationDevices[0]?.matchScore || 0}
                </span>
                <span style={{ fontSize: 16, color: '#666' }}> 分</span>
              </div>
              <div style={{ color: '#666' }}>
                共匹配 <span style={{ color: '#1890ff', fontWeight: 600 }}>{recommendation?.total_matches || 0}</span> 款器具
                ，推荐 <span style={{ color: '#52c41a', fontWeight: 600 }}>{recommendationDevices.length}</span> 款
              </div>
            </Space>
          </div>

          <Divider style={{ margin: '12px 0' }} />

          {recommendationDevices.map((device, index) => (
            <div key={device.id} className="recommendation-item">
              <div className="recommendation-score" style={{ background: `linear-gradient(135deg, ${getScoreColor(device.matchScore)}, #1890ff)` }}>
                {device.matchScore}分
              </div>
              <div className="recommendation-info">
                <div className="recommendation-name">
                  <Space>
                    {index === 0 && <Tag color="gold">最佳推荐</Tag>}
                    {device.name}
                    <Tag color="blue">{device.category}</Tag>
                    {device.brand && <Tag>{device.brand}</Tag>}
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
              ¥{recommendationDevices.reduce((sum, d) => sum + (d.price || 0), 0).toLocaleString()}
            </span>
          </div>
        </Card>
      )}

      {user?.role === 'adapter' && detail?.status !== 'completed' && (
        <Card className="detail-card" title="上门评估录入">
          <Form
            form={form}
            layout="vertical"
            onFinish={handleHomeAssessmentSubmit}
            initialValues={{
              disability_type: detail?.disability_type,
              disability_level: detail?.disability_level,
              height: bodyData.height,
              weight: bodyData.weight,
              age: bodyData.age,
              gender: bodyData.gender,
              daily_needs: detail?.daily_needs,
              living_environment: detail?.living_environment,
              medical_history: detail?.medical_history
            }}
          >
            <div className="detail-title">基本信息确认</div>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item label="残疾类型" name="disability_type" rules={[{ required: true, message: '请选择' }]}>
                  <Select>
                    {DISABILITY_TYPES.map(item => (
                      <Option key={item.value} value={item.value}>{item.label}</Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="残疾等级" name="disability_level" rules={[{ required: true, message: '请选择' }]}>
                  <Select>
                    {DISABILITY_LEVELS.map(item => (
                      <Option key={item.value} value={item.value}>{item.label}</Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={8}>
                <Form.Item label="身高 (cm)" name="height">
                  <Input style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item label="体重 (kg)" name="weight">
                  <Input style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item label="年龄" name="age">
                  <Input style={{ width: '100%' }} />
                </Form.Item>
              </Col>
            </Row>

            <Divider />

            <Form.Item label="评估详情" name="evaluation_details" rules={[{ required: true, message: '请填写评估详情' }]}>
              <TextArea rows={4} placeholder="请详细描述上门评估结果，包括身体状况、环境评估、功能评估等..." showCount maxLength={1000} />
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

      {user?.role === 'adapter' && detail?.status === 'completed' && (
        <div style={{ textAlign: 'center', padding: 24 }}>
          <Button type="primary" size="large" icon={<PlusOutlined />} onClick={handleCreatePlan}>
            生成适配方案
          </Button>
        </div>
      )}
    </div>
  )
}

export default AssessmentDetail
