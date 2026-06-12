import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Form,
  Input,
  Button,
  Card,
  message,
  Space,
  Select,
  InputNumber,
  Row,
  Col,
  DatePicker,
  Slider
} from 'antd'
import {
  ArrowLeftOutlined,
  SaveOutlined
} from '@ant-design/icons'
import { trainingAPI, userAPI } from '../../services/api'
import useUserStore from '../../store/useUserStore'
import dayjs from 'dayjs'

const { TextArea } = Input
const { Option } = Select
const { RangePicker } = DatePicker

const TRAINING_TYPES = [
  { value: 'strength', label: '力量训练' },
  { value: 'endurance', label: '耐力训练' },
  { value: 'flexibility', label: '柔韧性训练' },
  { value: 'balance', label: '平衡训练' },
  { value: 'coordination', label: '协调性训练' },
  { value: 'rehabilitation', label: '康复训练' }
]

const TrainingPlanForm = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useUserStore()
  const isEdit = !!id
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [users, setUsers] = useState([])
  const [userLoading, setUserLoading] = useState(false)

  const fetchUsers = async () => {
    setUserLoading(true)
    try {
      const res = await userAPI.getUsers({ role: 'disabled', page: 1, pageSize: 50 })
      if (res.code === 200) {
        setUsers(res.data?.list || res.data || [])
      }
    } catch (error) {
      console.error('获取用户列表失败:', error)
    } finally {
      setUserLoading(false)
    }
  }

  const fetchPlanDetail = async () => {
    if (!isEdit) return
    setLoading(true)
    try {
      const res = await trainingAPI.getPlanDetail(id)
      if (res.code === 200) {
        const data = res.data
        form.setFieldsValue({
          name: data.name,
          userId: data.userId,
          trainingType: data.trainingType,
          description: data.description,
          initialIntensity: data.initialIntensity || data.intensity || 5,
          initialFrequency: data.initialFrequency || data.frequency || 3,
          target: data.target,
          cycle: data.cycle,
          startDate: data.startDate ? dayjs(data.startDate) : undefined,
          endDate: data.endDate ? dayjs(data.endDate) : undefined
        })
      }
    } catch (error) {
      console.error('获取训练计划详情失败:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
    fetchPlanDetail()
  }, [id])

  const handleSubmit = async (values) => {
    setSubmitting(true)
    try {
      const data = {
        ...values,
        startDate: values.startDate ? values.startDate.format('YYYY-MM-DD') : undefined,
        endDate: values.endDate ? values.endDate.format('YYYY-MM-DD') : undefined,
        intensity: values.initialIntensity,
        frequency: values.initialFrequency
      }
      const res = isEdit
        ? await trainingAPI.updatePlan(id, data)
        : await trainingAPI.createPlan(data)
      if (res.code === 200) {
        message.success(isEdit ? '训练计划更新成功' : '训练计划创建成功')
        navigate('/training/plans')
      }
    } catch (error) {
      console.error('提交训练计划失败:', error)
    } finally {
      setSubmitting(false)
    }
  }

  const marks = {
    1: '1',
    3: '3',
    5: '5',
    7: '7',
    10: '10'
  }

  const frequencyMarks = {
    1: '1次',
    3: '3次',
    5: '5次',
    7: '7次'
  }

  const canSelectUser = user?.role === 'therapist' || user?.role === 'admin'

  return (
    <div className="form-container">
      <Button
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate('/training/plans')}
        style={{ marginBottom: 20 }}
      >
        返回列表
      </Button>

      <div className="page-title">{isEdit ? '编辑训练计划' : '创建训练计划'}</div>

      <Card loading={loading}>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <div className="detail-title">基本信息</div>

          <Form.Item
            label="计划名称"
            name="name"
            rules={[{ required: true, message: '请输入计划名称' }]}
          >
            <Input placeholder="请输入计划名称" maxLength={100} />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="训练类型"
                name="trainingType"
                rules={[{ required: true, message: '请选择训练类型' }]}
              >
                <Select placeholder="请选择训练类型">
                  {TRAINING_TYPES.map(item => (
                    <Option key={item.value} value={item.value}>{item.label}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              {canSelectUser && (
                <Form.Item
                  label="训练用户"
                  name="userId"
                  rules={[{ required: true, message: '请选择训练用户' }]}
                >
                  <Select
                    placeholder="请选择训练用户"
                    showSearch
                    optionFilterProp="children"
                    loading={userLoading}
                  >
                    {users.map(u => (
                      <Option key={u.id} value={u.id}>{u.name || u.userName}</Option>
                    ))}
                  </Select>
                </Form.Item>
              )}
            </Col>
          </Row>

          <Form.Item
            label="计划描述"
            name="description"
            rules={[{ required: true, message: '请输入计划描述' }]}
          >
            <TextArea rows={3} placeholder="请简要描述训练计划的目的和内容..." showCount maxLength={300} />
          </Form.Item>

          <div className="detail-title">初始参数</div>

          <Row gutter={24}>
            <Col span={12}>
              <Form.Item
                label="初始强度（1-10级）"
                name="initialIntensity"
                rules={[{ required: true, message: '请设置初始强度' }]}
              >
                <Slider
                  min={1}
                  max={10}
                  marks={marks}
                  step={1}
                  tooltip={{ formatter: (value) => `${value}级` }}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="初始频率（每周次数）"
                name="initialFrequency"
                rules={[{ required: true, message: '请设置初始频率' }]}
              >
                <Slider
                  min={1}
                  max={7}
                  marks={frequencyMarks}
                  step={1}
                  tooltip={{ formatter: (value) => `${value}次/周` }}
                />
              </Form.Item>
            </Col>
          </Row>

          <div className="detail-title">训练目标与周期</div>

          <Form.Item
            label="训练目标"
            name="target"
            rules={[{ required: true, message: '请输入训练目标' }]}
          >
            <TextArea rows={2} placeholder="请描述训练目标，如：提高上肢力量、改善平衡能力等..." showCount maxLength={200} />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="开始日期"
                name="startDate"
                rules={[{ required: true, message: '请选择开始日期' }]}
              >
                <DatePicker style={{ width: '100%' }} placeholder="请选择开始日期" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="结束日期"
                name="endDate"
                rules={[{ required: true, message: '请选择结束日期' }]}
              >
                <DatePicker style={{ width: '100%' }} placeholder="请选择结束日期" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            label="训练周期（周）"
            name="cycle"
          >
            <InputNumber
              min={1}
              max={52}
              style={{ width: 200 }}
              placeholder="请输入训练周期"
              addonAfter="周"
            />
          </Form.Item>

          <div style={{ textAlign: 'right', paddingTop: 20 }}>
            <Space>
              <Button size="large" onClick={() => navigate('/training/plans')}>
                取消
              </Button>
              <Button type="primary" size="large" htmlType="submit" loading={submitting} icon={<SaveOutlined />}>
                {isEdit ? '保存修改' : '创建计划'}
              </Button>
            </Space>
          </div>
        </Form>
      </Card>
    </div>
  )
}

export default TrainingPlanForm
