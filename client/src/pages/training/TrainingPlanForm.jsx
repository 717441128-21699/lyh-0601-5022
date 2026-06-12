import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
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
  Slider,
  List
} from 'antd'
import {
  ArrowLeftOutlined,
  SaveOutlined,
  PlusOutlined,
  DeleteOutlined
} from '@ant-design/icons'
import { trainingAPI, userAPI } from '../../services/api'
import useUserStore from '../../store/useUserStore'

const { TextArea } = Input
const { Option } = Select

const TrainingPlanForm = () => {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user } = useUserStore()
  const urlId = id || searchParams.get('id')
  const isEdit = !!urlId
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [users, setUsers] = useState([])
  const [userLoading, setUserLoading] = useState(false)
  const [exercises, setExercises] = useState([
    { id: 1, name: '', sets: 3, reps: 10, weight: 0 }
  ])

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
      const res = await trainingAPI.getPlanDetail(urlId)
      if (res.code === 200) {
        const data = res.data
        form.setFieldsValue({
          plan_name: data.plan_name,
          user_id: data.user_id,
          plan_description: data.plan_description,
          initial_intensity: data.initial_intensity || data.current_intensity || 5,
          initial_frequency: data.initial_frequency || data.current_frequency || 3,
          notes: data.notes,
          target_duration: data.target_duration
        })
        if (data.exercises && Array.isArray(data.exercises) && data.exercises.length > 0) {
          setExercises(data.exercises.map((e, i) => ({ id: i + 1, ...e })))
        }
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
  }, [urlId])

  const handleAddExercise = () => {
    const newId = Math.max(...exercises.map(i => i.id), 0) + 1
    setExercises([...exercises, { id: newId, name: '', sets: 3, reps: 10, weight: 0 }])
  }

  const handleRemoveExercise = (id) => {
    setExercises(exercises.filter(item => item.id !== id))
  }

  const handleExerciseChange = (id, field, value) => {
    setExercises(exercises.map(item =>
      item.id === id ? { ...item, [field]: value } : item
    ))
  }

  const handleSubmit = async (values) => {
    const validExercises = exercises.filter(e => e.name)
    if (validExercises.length === 0) {
      message.warning('请至少添加一个训练项目')
      return
    }
    setSubmitting(true)
    try {
      const data = {
        user_id: values.user_id,
        plan_name: values.plan_name,
        plan_description: values.plan_description,
        exercises: validExercises.map(e => ({
          name: e.name,
          sets: e.sets,
          reps: e.reps,
          weight: e.weight
        })),
        target_duration: values.target_duration,
        initial_intensity: values.initial_intensity,
        initial_frequency: values.initial_frequency,
        notes: values.notes
      }
      const res = isEdit
        ? await trainingAPI.updatePlan(urlId, data)
        : await trainingAPI.createPlan(data)
      if (res.code === 200) {
        message.success(isEdit ? '训练计划更新成功' : '训练计划创建成功')
        navigate('/training')
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
        onClick={() => navigate('/training')}
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
          initialValues={{
            initial_intensity: 5,
            initial_frequency: 3,
            target_duration: 30
          }}
        >
          <div className="detail-title">基本信息</div>

          <Form.Item
            label="计划名称"
            name="plan_name"
            rules={[{ required: true, message: '请输入计划名称' }]}
          >
            <Input placeholder="请输入计划名称" maxLength={100} />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              {canSelectUser && (
                <Form.Item
                  label="训练用户"
                  name="user_id"
                  rules={[{ required: true, message: '请选择训练用户' }]}
                >
                  <Select
                    placeholder="请选择训练用户"
                    showSearch
                    optionFilterProp="children"
                    loading={userLoading}
                  >
                    {users.map(u => (
                      <Option key={u.id} value={u.id}>{u.real_name || u.name || u.user_name}</Option>
                    ))}
                  </Select>
                </Form.Item>
              )}
            </Col>
            <Col span={12}>
              <Form.Item
                label="目标周期（天）"
                name="target_duration"
                rules={[{ required: true, message: '请输入目标周期' }]}
              >
                <InputNumber
                  min={1}
                  max={365}
                  style={{ width: '100%' }}
                  placeholder="请输入目标周期"
                  addonAfter="天"
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            label="计划描述"
            name="plan_description"
            rules={[{ required: true, message: '请输入计划描述' }]}
          >
            <TextArea rows={3} placeholder="请简要描述训练计划的目的和内容..." showCount maxLength={300} />
          </Form.Item>

          <div className="detail-title">初始参数</div>

          <Row gutter={24}>
            <Col span={12}>
              <Form.Item
                label="初始强度（1-10级）"
                name="initial_intensity"
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
                name="initial_frequency"
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

          <div className="detail-title">
            <Space>
              训练项目
              <Button
                type="primary"
                size="small"
                icon={<PlusOutlined />}
                onClick={handleAddExercise}
              >
                添加项目
              </Button>
            </Space>
          </div>

          <List
            dataSource={exercises}
            renderItem={(item) => (
              <List.Item key={item.id}>
                <Row gutter={12} style={{ width: '100%' }} align="middle">
                  <Col span={8}>
                    <Input
                      placeholder="项目名称"
                      value={item.name}
                      onChange={(e) => handleExerciseChange(item.id, 'name', e.target.value)}
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
                      onChange={(value) => handleExerciseChange(item.id, 'sets', value)}
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
                      onChange={(value) => handleExerciseChange(item.id, 'reps', value)}
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
                      onChange={(value) => handleExerciseChange(item.id, 'weight', value)}
                    />
                  </Col>
                  <Col span={3}>
                    <Button
                      type="text"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => handleRemoveExercise(item.id)}
                      disabled={exercises.length === 1}
                    />
                  </Col>
                </Row>
              </List.Item>
            )}
            style={{ marginBottom: 24 }}
          />

          <div className="detail-title">训练目标</div>

          <Form.Item
            label="训练目标"
            name="notes"
            rules={[{ required: true, message: '请输入训练目标' }]}
          >
            <TextArea rows={2} placeholder="请描述训练目标，如：提高上肢力量、改善平衡能力等..." showCount maxLength={200} />
          </Form.Item>

          <div style={{ textAlign: 'right', paddingTop: 20 }}>
            <Space>
              <Button size="large" onClick={() => navigate('/training')}>
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
