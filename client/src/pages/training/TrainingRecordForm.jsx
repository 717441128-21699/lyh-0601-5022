import React, { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Form,
  Input,
  Button,
  Card,
  message,
  Space,
  InputNumber,
  DatePicker,
  Slider,
  Row,
  Col,
  List,
  Divider,
  Modal,
  Statistic
} from 'antd'
import {
  ArrowLeftOutlined,
  PlusOutlined,
  DeleteOutlined,
  SaveOutlined,
  CheckCircleOutlined
} from '@ant-design/icons'
import { trainingAPI } from '../../services/api'
import useUserStore from '../../store/useUserStore'
import dayjs from 'dayjs'

const { TextArea } = Input
const { confirm } = Modal

const TrainingRecordForm = () => {
  const [searchParams] = useSearchParams()
  const planId = searchParams.get('planId')
  const navigate = useNavigate()
  const { user } = useUserStore()
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [planDetail, setPlanDetail] = useState(null)
  const [resultVisible, setResultVisible] = useState(false)
  const [adjustResult, setAdjustResult] = useState(null)
  const [items, setItems] = useState([
    { id: 1, name: '', sets: 3, reps: 10, weight: 0 }
  ])

  const fetchPlanDetail = async () => {
    if (!planId) return
    setLoading(true)
    try {
      const res = await trainingAPI.getPlanDetail(planId)
      if (res.code === 200) {
        setPlanDetail(res.data)
        form.setFieldsValue({
          current_intensity: res.data.current_intensity || res.data.initial_intensity || 5
        })
      }
    } catch (error) {
      console.error('获取训练计划详情失败:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPlanDetail()
  }, [planId])

  const completionMarks = {
    0: '0%',
    25: '25%',
    50: '50%',
    75: '75%',
    100: '100%'
  }

  const handleAddItem = () => {
    const newId = Math.max(...items.map(i => i.id), 0) + 1
    setItems([...items, { id: newId, name: '', sets: 3, reps: 10, weight: 0 }])
  }

  const handleRemoveItem = (id) => {
    setItems(items.filter(item => item.id !== id))
  }

  const handleItemChange = (id, field, value) => {
    setItems(items.map(item =>
      item.id === id ? { ...item, [field]: value } : item
    ))
  }

  const handleSubmit = async (values) => {
    if (items.length === 0 || !items.some(i => i.name)) {
      message.warning('请至少添加一个训练项目')
      return
    }
    setSubmitting(true)
    try {
      const data = {
        plan_id: planId,
        training_date: values.training_date ? values.training_date.format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'),
        duration: values.duration,
        completion_rate: values.completion_rate,
        current_intensity: values.current_intensity,
        actual_exercises: items.filter(i => i.name).map(i => ({
          name: i.name,
          sets: i.sets,
          reps: i.reps,
          weight: i.weight
        })),
        feedback: values.feedback,
        notes: values.notes
      }
      const res = await trainingAPI.createRecord(data)
      if (res.code === 200) {
        setAdjustResult(res.data)
        setResultVisible(true)
      }
    } catch (error) {
      console.error('提交训练记录失败:', error)
    } finally {
      setSubmitting(false)
    }
  }

  const handleCloseResult = () => {
    setResultVisible(false)
    navigate(`/training/${planId}`)
  }

  const handleViewDetail = () => {
    setResultVisible(false)
    if (adjustResult?.id) {
      navigate(`/training/records/${adjustResult.id}`)
    } else {
      navigate(`/training/${planId}`)
    }
  }

  return (
    <div className="form-container">
      <Button
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate(`/training/${planId}`)}
        style={{ marginBottom: 20 }}
      >
        返回
      </Button>

      <div className="page-title">创建训练记录</div>

      {planDetail && (
        <Card className="detail-card" size="small" style={{ marginBottom: 16 }}>
          <Space size="large">
            <span><strong>计划名称：</strong>{planDetail.plan_name}</span>
            <span><strong>当前强度：</strong>{planDetail.current_intensity || planDetail.initial_intensity || 0}/10</span>
            <span><strong>用户：</strong>{planDetail.user_name || '-'}</span>
          </Space>
        </Card>
      )}

      <Card loading={loading}>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            training_date: dayjs(),
            duration: 30,
            completion_rate: 80,
            current_intensity: 5
          }}
        >
          <div className="detail-title">基本信息</div>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="训练日期"
                name="training_date"
                rules={[{ required: true, message: '请选择训练日期' }]}
              >
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="训练时长（分钟）"
                name="duration"
                rules={[{ required: true, message: '请输入训练时长' }]}
              >
                <InputNumber
                  min={5}
                  max={300}
                  style={{ width: '100%' }}
                  placeholder="请输入训练时长"
                  addonAfter="分钟"
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            label="完成度"
            name="completion_rate"
            rules={[{ required: true, message: '请设置完成度' }]}
          >
            <Slider
              min={0}
              max={100}
              marks={completionMarks}
              step={5}
              tooltip={{ formatter: (value) => `${value}%` }}
            />
          </Form.Item>

          <Form.Item
            label="训练强度（1-10级）"
            name="current_intensity"
            rules={[{ required: true, message: '请设置训练强度' }]}
          >
            <Slider
              min={1}
              max={10}
              marks={{ 1: '1', 3: '3', 5: '5', 7: '7', 10: '10' }}
              step={1}
              tooltip={{ formatter: (value) => `${value}级` }}
            />
          </Form.Item>

          <Divider />

          <div className="detail-title">
            <Space>
              训练项目
              <Button
                type="primary"
                size="small"
                icon={<PlusOutlined />}
                onClick={handleAddItem}
              >
                添加项目
              </Button>
            </Space>
          </div>

          <List
            dataSource={items}
            renderItem={(item) => (
              <List.Item key={item.id}>
                <Row gutter={12} style={{ width: '100%' }} align="middle">
                  <Col span={8}>
                    <Input
                      placeholder="项目名称"
                      value={item.name}
                      onChange={(e) => handleItemChange(item.id, 'name', e.target.value)}
                    />
                  </Col>
                  <Col span={4}>
                    <InputNumber
                      min={1}
                      max={20}
                      style={{ width: '100%' }}
                      placeholder="组数"
                      addonBefore="组"
                      value={item.sets}
                      onChange={(value) => handleItemChange(item.id, 'sets', value)}
                    />
                  </Col>
                  <Col span={4}>
                    <InputNumber
                      min={1}
                      max={100}
                      style={{ width: '100%' }}
                      placeholder="次数"
                      addonBefore="次"
                      value={item.reps}
                      onChange={(value) => handleItemChange(item.id, 'reps', value)}
                    />
                  </Col>
                  <Col span={5}>
                    <InputNumber
                      min={0}
                      max={500}
                      style={{ width: '100%' }}
                      placeholder="重量"
                      addonAfter="kg"
                      value={item.weight}
                      onChange={(value) => handleItemChange(item.id, 'weight', value)}
                    />
                  </Col>
                  <Col span={3}>
                    <Button
                      type="text"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => handleRemoveItem(item.id)}
                      disabled={items.length === 1}
                    />
                  </Col>
                </Row>
              </List.Item>
            )}
            style={{ marginBottom: 24 }}
          />

          <Divider />

          <div className="detail-title">训练详情</div>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="训练备注"
                name="notes"
              >
                <TextArea rows={3} placeholder="请填写训练备注..." showCount maxLength={300} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="用户反馈"
                name="feedback"
              >
                <TextArea rows={3} placeholder="用户的主观感受和反馈..." showCount maxLength={300} />
              </Form.Item>
            </Col>
          </Row>

          <div style={{ textAlign: 'right', paddingTop: 20 }}>
            <Space>
              <Button size="large" onClick={() => navigate(-1)}>
                取消
              </Button>
              <Button type="primary" size="large" htmlType="submit" loading={submitting} icon={<SaveOutlined />}>
                提交记录
              </Button>
            </Space>
          </div>
        </Form>
      </Card>

      <Modal
        title={
          <Space>
            <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 20 }} />
            训练记录提交成功
          </Space>
        }
        open={resultVisible}
        onCancel={handleCloseResult}
        footer={[
          <Button key="close" onClick={handleCloseResult}>
            返回计划
          </Button>,
          <Button key="detail" type="primary" onClick={handleViewDetail}>
            查看详情
          </Button>
        ]}
        width={500}
      >
        <div style={{ padding: '10px 0' }}>
          <p style={{ color: '#666', marginBottom: 20 }}>系统根据本次训练情况，自动调整了下一次训练参数：</p>
          
          <Row gutter={16}>
            <Col span={12}>
              <Card size="small" style={{ textAlign: 'center' }}>
                <Statistic
                  title="下一次强度"
                  value={adjustResult?.next_intensity || adjustResult?.current_intensity || 0}
                  suffix="/10"
                  valueStyle={{ color: '#1890ff' }}
                />
                {adjustResult?.intensityAdjustment && (
                  <div style={{ fontSize: 12, color: '#52c41a', marginTop: 4 }}>
                    {adjustResult.intensityAdjustment > 0 ? `+${adjustResult.intensityAdjustment}` : adjustResult.intensityAdjustment}
                  </div>
                )}
              </Card>
            </Col>
            <Col span={12}>
              <Card size="small" style={{ textAlign: 'center' }}>
                <Statistic
                  title="下一次频率"
                  value={adjustResult?.next_frequency || adjustResult?.current_frequency || 0}
                  suffix="次/周"
                  valueStyle={{ color: '#52c41a' }}
                />
                {adjustResult?.frequencyAdjustment && (
                  <div style={{ fontSize: 12, color: '#52c41a', marginTop: 4 }}>
                    {adjustResult.frequencyAdjustment > 0 ? `+${adjustResult.frequencyAdjustment}` : adjustResult.frequencyAdjustment}
                  </div>
                )}
              </Card>
            </Col>
          </Row>

          {adjustResult?.adjustment_reason && (
            <div style={{ marginTop: 16, padding: 12, background: '#f6ffed', borderRadius: 6, border: '1px solid #b7eb8f' }}>
              <div style={{ fontWeight: 500, marginBottom: 4 }}>调整说明</div>
              <div style={{ fontSize: 13, color: '#666' }}>{adjustResult.adjustment_reason}</div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  )
}

export default TrainingRecordForm
