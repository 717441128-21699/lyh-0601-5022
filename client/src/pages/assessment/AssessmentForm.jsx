import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Form, Input, Select, Radio, InputNumber, Button, Card, message, Space, Divider, Tag, Result } from 'antd'
import { ArrowLeftOutlined, CheckCircleOutlined, ThunderboltOutlined } from '@ant-design/icons'
import { assessmentAPI } from '../../services/api'
import { DISABILITY_TYPES, DISABILITY_LEVELS } from '../../utils/constants'

const { TextArea } = Input
const { Option } = Select
const { Group: RadioGroup } = Radio

const AssessmentForm = () => {
  const navigate = useNavigate()
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [showResult, setShowResult] = useState(false)
  const [recommendation, setRecommendation] = useState(null)
  const [assessmentId, setAssessmentId] = useState(null)

  const handleSubmit = async (values) => {
    setLoading(true)
    try {
      const res = await assessmentAPI.createAssessment({
        ...values,
        type: 'online'
      })
      if (res.code === 200) {
        message.success('评估提交成功')
        setAssessmentId(res.data?.id)
        setRecommendation(res.data?.recommendation)
        setShowResult(true)
      }
    } catch (error) {
      console.error('提交评估失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const getScoreColor = (score) => {
    if (score >= 90) return '#52c41a'
    if (score >= 70) return '#1890ff'
    if (score >= 60) return '#faad14'
    return '#ff4d4f'
  }

  const recommendationDevices = recommendation?.devices || [
    { id: 1, name: '智能轮椅 Pro', matchScore: 95, description: '电动智能轮椅，支持语音控制和自动导航', price: 12800, category: '轮椅' },
    { id: 2, name: '助行器', matchScore: 88, description: '轻便折叠助行器，高度可调节', price: 680, category: '助行器具' },
    { id: 3, name: '坐姿矫正坐垫', matchScore: 76, description: '记忆棉材质，有效改善坐姿', price: 299, category: '康复辅具' }
  ]

  if (showResult) {
    return (
      <div className="form-container">
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/assessments')}
          style={{ marginBottom: 20 }}
        >
          返回列表
        </Button>

        <Result
          status="success"
          title="评估提交成功"
          subTitle="系统已为您智能推荐以下适配方案"
          extra={[
            <Button type="primary" key="detail" onClick={() => navigate(`/assessments/${assessmentId}`)}>
              查看评估详情
            </Button>,
            <Button key="list" onClick={() => navigate('/assessments')}>
              返回列表
            </Button>
          ]}
        />

        <Card title="智能推荐结果" style={{ marginTop: 24 }}>
          <div style={{ marginBottom: 20 }}>
            <Space align="center">
              <ThunderboltOutlined style={{ fontSize: 24, color: '#faad14' }} />
              <span style={{ fontSize: 16, fontWeight: 600 }}>综合匹配度</span>
              <span style={{ fontSize: 28, fontWeight: 'bold', color: getScoreColor(recommendation?.overallScore || 85) }}>
                {recommendation?.overallScore || 85}分
              </span>
            </Space>
          </div>

          <Divider />

          <div className="detail-title" style={{ marginTop: 0 }}>推荐器具列表</div>

          {recommendationDevices.map((device, index) => (
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
              ¥{recommendationDevices.reduce((sum, d) => sum + (d.price || 0), 0).toLocaleString()}
            </span>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="form-container">
      <Button
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate('/assessments')}
        style={{ marginBottom: 20 }}
      >
        返回列表
      </Button>

      <div className="page-title">在线评估</div>

      <Card>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{ gender: 'male' }}
        >
          <div className="detail-title">基本信息</div>

          <Form.Item
            label="残疾类型"
            name="disabilityType"
            rules={[{ required: true, message: '请选择残疾类型' }]}
          >
            <Select placeholder="请选择残疾类型">
              {DISABILITY_TYPES.map(item => (
                <Option key={item.value} value={item.value}>{item.label}</Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            label="残疾等级"
            name="disabilityLevel"
            rules={[{ required: true, message: '请选择残疾等级' }]}
          >
            <Select placeholder="请选择残疾等级">
              {DISABILITY_LEVELS.map(item => (
                <Option key={item.value} value={item.value}>{item.label}</Option>
              ))}
            </Select>
          </Form.Item>

          <Space size="large" style={{ width: '100%' }}>
            <Form.Item
              label="身高 (cm)"
              name="height"
              rules={[{ required: true, message: '请输入身高' }]}
              style={{ flex: 1, marginBottom: 24 }}
            >
              <InputNumber min={50} max={250} style={{ width: '100%' }} placeholder="请输入身高" />
            </Form.Item>

            <Form.Item
              label="体重 (kg)"
              name="weight"
              rules={[{ required: true, message: '请输入体重' }]}
              style={{ flex: 1, marginBottom: 24 }}
            >
              <InputNumber min={10} max={200} style={{ width: '100%' }} placeholder="请输入体重" />
            </Form.Item>

            <Form.Item
              label="年龄"
              name="age"
              rules={[{ required: true, message: '请输入年龄' }]}
              style={{ flex: 1, marginBottom: 24 }}
            >
              <InputNumber min={1} max={120} style={{ width: '100%' }} placeholder="请输入年龄" />
            </Form.Item>
          </Space>

          <Form.Item
            label="性别"
            name="gender"
            rules={[{ required: true, message: '请选择性别' }]}
          >
            <RadioGroup>
              <Radio value="male">男</Radio>
              <Radio value="female">女</Radio>
            </RadioGroup>
          </Form.Item>

          <Divider />

          <div className="detail-title">详细评估</div>

          <Form.Item
            label="日常需求"
            name="dailyNeeds"
            rules={[{ required: true, message: '请描述日常需求' }]}
          >
            <TextArea
              rows={4}
              placeholder="请详细描述您的日常生活需求，如移动、进食、穿衣、洗漱等方面的困难..."
              showCount
              maxLength={500}
            />
          </Form.Item>

          <Form.Item
            label="病史"
            name="medicalHistory"
          >
            <TextArea
              rows={3}
              placeholder="请描述相关病史、过敏史或其他需要注意的健康问题..."
              showCount
              maxLength={300}
            />
          </Form.Item>

          <Form.Item
            label="居住环境"
            name="livingEnvironment"
            rules={[{ required: true, message: '请描述居住环境' }]}
          >
            <TextArea
              rows={3}
              placeholder="请描述您的居住环境，如是否有电梯、楼梯、卫生间设施等..."
              showCount
              maxLength={300}
            />
          </Form.Item>

          <Form.Item style={{ marginTop: 32, marginBottom: 0 }}>
            <Space>
              <Button type="primary" htmlType="submit" loading={loading} size="large">
                提交评估
              </Button>
              <Button size="large" onClick={() => form.resetFields()}>
                重置
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}

export default AssessmentForm
