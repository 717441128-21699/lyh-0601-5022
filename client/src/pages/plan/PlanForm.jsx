import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import {
  Form,
  Input,
  Button,
  Card,
  message,
  Space,
  Divider,
  Table,
  Modal,
  Select,
  InputNumber,
  Row,
  Col,
  Tag,
  Empty
} from 'antd'
import {
  ArrowLeftOutlined,
  PlusOutlined,
  DeleteOutlined,
  AppstoreOutlined,
  SaveOutlined
} from '@ant-design/icons'
import { planAPI, deviceAPI, assessmentAPI } from '../../services/api'

const { TextArea } = Input
const { Option } = Select

const PlanForm = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const assessmentId = searchParams.get('assessmentId')
  const isEdit = !!id
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [selectedDevices, setSelectedDevices] = useState([])
  const [deviceModalVisible, setDeviceModalVisible] = useState(false)
  const [deviceList, setDeviceList] = useState([])
  const [deviceLoading, setDeviceLoading] = useState(false)
  const [assessmentInfo, setAssessmentInfo] = useState(null)
  const [categories, setCategories] = useState([])
  const [assessments, setAssessments] = useState([])
  const [selectedAssessmentId, setSelectedAssessmentId] = useState(null)

  const fetchAssessmentInfo = async (id) => {
    if (!id) return
    try {
      const res = await assessmentAPI.getAssessmentDetail(id)
      if (res.code === 200) {
        setAssessmentInfo(res.data)
      }
    } catch (error) {
      console.error('获取评估信息失败:', error)
    }
  }

  const fetchAssessments = async () => {
    if (isEdit) return
    try {
      const res = await assessmentAPI.getAssessments({ status: 'completed' })
      if (res.code === 200) {
        setAssessments(res.data?.list || res.data || [])
      }
    } catch (error) {
      console.error('获取评估列表失败:', error)
    }
  }

  const fetchRecommendation = async (id) => {
    if (!id || isEdit) return
    try {
      const res = await assessmentAPI.getRecommendation(id)
      if (res.code === 200 && res.data?.recommendations) {
        const recommendedDevices = res.data.recommendations.map(r => ({
          device_id: r.device.id,
          device_name: r.device.name,
          quantity: 1,
          unit_price: r.device.price,
          subtotal: r.device.price
        }))
        setSelectedDevices(recommendedDevices)
      }
    } catch (error) {
      console.error('获取推荐器具失败:', error)
    }
  }

  const fetchPlanDetail = async () => {
    if (!isEdit) return
    setLoading(true)
    try {
      const res = await planAPI.getPlanDetail(id)
      if (res.code === 200) {
        const data = res.data
        form.setFieldsValue({
          plan_name: data.plan_name,
          plan_description: data.plan_description,
          usage_instructions: data.usage_instructions,
          precautions: data.precautions,
          estimated_effect: data.estimated_effect
        })
        setSelectedDevices(data.devices || [])
      }
    } catch (error) {
      console.error('获取方案详情失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchCategories = async () => {
    try {
      const res = await deviceAPI.getCategories()
      if (res.code === 200) {
        setCategories(res.data || [])
      }
    } catch (error) {
      console.error('获取分类失败:', error)
    }
  }

  const fetchDeviceList = async (params = {}) => {
    setDeviceLoading(true)
    try {
      const res = await deviceAPI.getDevices({ page: 1, pageSize: 50, ...params })
      if (res.code === 200) {
        setDeviceList(res.data?.list || res.data || [])
      }
    } catch (error) {
      console.error('获取设备列表失败:', error)
    } finally {
      setDeviceLoading(false)
    }
  }

  useEffect(() => {
    fetchAssessments()
    fetchCategories()
    fetchPlanDetail()
    if (assessmentId && !isEdit) {
      setSelectedAssessmentId(assessmentId)
      fetchAssessmentInfo(assessmentId)
      fetchRecommendation(assessmentId)
    }
  }, [id, assessmentId])

  useEffect(() => {
    if (selectedAssessmentId && !isEdit && !assessmentId) {
      fetchAssessmentInfo(selectedAssessmentId)
      fetchRecommendation(selectedAssessmentId)
    }
  }, [selectedAssessmentId])

  const totalPrice = selectedDevices.reduce((sum, item) => sum + (item.unit_price * (item.quantity || 1)), 0)

  const handleAddDevice = (device) => {
    const exists = selectedDevices.find(d => d.device_id === device.id)
    if (exists) {
      message.info('该器具已在列表中')
      return
    }
    setSelectedDevices([...selectedDevices, {
      device_id: device.id,
      device_name: device.name,
      quantity: 1,
      unit_price: device.price,
      subtotal: device.price
    }])
    setDeviceModalVisible(false)
  }

  const handleRemoveDevice = (deviceId) => {
    setSelectedDevices(selectedDevices.filter(d => d.device_id !== deviceId))
  }

  const handleQuantityChange = (deviceId, value) => {
    setSelectedDevices(selectedDevices.map(d =>
      d.device_id === deviceId ? { ...d, quantity: value || 1, subtotal: d.unit_price * (value || 1) } : d
    ))
  }

  const handleSubmit = async (values) => {
    if (!isEdit && !selectedAssessmentId) {
      message.warning('请先选择关联评估')
      return
    }
    if (selectedDevices.length === 0) {
      message.warning('请至少选择一个器具')
      return
    }
    setSubmitting(true)
    try {
      const data = {
        assessment_id: selectedAssessmentId || assessmentInfo?.id,
        plan_name: values.plan_name,
        plan_description: values.plan_description,
        devices: selectedDevices.map(d => ({
          device_id: d.device_id,
          device_name: d.device_name,
          quantity: d.quantity || 1,
          unit_price: d.unit_price,
          subtotal: d.subtotal || d.unit_price * (d.quantity || 1)
        })),
        usage_instructions: values.usage_instructions,
        precautions: values.precautions,
        estimated_effect: values.estimated_effect,
        total_price: totalPrice
      }
      const res = isEdit
        ? await planAPI.updatePlan(id, data)
        : await planAPI.createPlan(data)
      if (res.code === 200) {
        message.success(isEdit ? '方案更新成功' : '方案创建成功')
        const planId = res.data?.id || res.data
        navigate(`/plans/${planId}`)
      }
    } catch (error) {
      console.error('提交方案失败:', error)
    } finally {
      setSubmitting(false)
    }
  }

  const deviceColumns = [
    {
      title: '器具名称',
      dataIndex: 'device_name',
      key: 'device_name',
      render: (text) => (
        <Space>
          {text}
        </Space>
      )
    },
    {
      title: '单价',
      dataIndex: 'unit_price',
      key: 'unit_price',
      width: 120,
      render: (text) => `¥${Number(text).toLocaleString()}`
    },
    {
      title: '数量',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 150,
      render: (_, record) => (
        <InputNumber
          min={1}
          max={99}
          value={record.quantity || 1}
          onChange={(value) => handleQuantityChange(record.device_id, value)}
        />
      )
    },
    {
      title: '小计',
      dataIndex: 'subtotal',
      key: 'subtotal',
      width: 120,
      render: (text, record) => `¥${(record.subtotal || record.unit_price * (record.quantity || 1)).toLocaleString()}`
    },
    {
      title: '操作',
      key: 'action',
      width: 80,
      render: (_, record) => (
        <Button
          type="link"
          danger
          size="small"
          icon={<DeleteOutlined />}
          onClick={() => handleRemoveDevice(record.device_id)}
        >
          删除
        </Button>
      )
    }
  ]

  const modalDeviceColumns = [
    {
      title: '器具名称',
      dataIndex: 'name',
      key: 'name'
    },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      width: 120,
      render: (text) => text ? <Tag>{text}</Tag> : '-'
    },
    {
      title: '价格',
      dataIndex: 'price',
      key: 'price',
      width: 120,
      render: (text) => `¥${Number(text).toLocaleString()}`
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_, record) => (
        <Button
          type="primary"
          size="small"
          icon={<PlusOutlined />}
          onClick={() => handleAddDevice(record)}
          disabled={selectedDevices.some(d => d.device_id === record.id)}
        >
          选择
        </Button>
      )
    }
  ]

  return (
    <div className="form-container">
      <Button
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate('/plans')}
        style={{ marginBottom: 20 }}
      >
        返回列表
      </Button>

      <div className="page-title">{isEdit ? '编辑适配方案' : '创建适配方案'}</div>

      {isEdit && assessmentInfo && (
        <Card className="detail-card" size="small" style={{ marginBottom: 16 }}>
          <Space size="large">
            <span><strong>关联评估：</strong>#{assessmentInfo.id}</span>
            <span><strong>用户：</strong>{assessmentInfo.userName || '-'}</span>
            <span><strong>残疾类型：</strong>{assessmentInfo.disabilityType || '-'}</span>
            <span><strong>残疾等级：</strong>{assessmentInfo.disabilityLevel || '-'}</span>
          </Space>
        </Card>
      )}

      <Card loading={loading}>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <div className="detail-title">基本信息</div>

          {!isEdit && (
            <Form.Item
              label="关联评估"
              name="assessment_id"
              rules={[{ required: true, message: '请选择关联评估' }]}
            >
              <Select
                placeholder="请选择已完成的评估"
                value={selectedAssessmentId}
                onChange={(value) => setSelectedAssessmentId(value)}
                showSearch
                optionFilterProp="children"
              >
                {assessments.map(item => (
                  <Option key={item.id} value={item.id}>
                    #{item.id} - {item.user_name} - {item.disability_type}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          )}

          {isEdit && assessmentInfo && (
            <Form.Item label="关联评估">
              <Input
                value={`#${assessmentInfo.id} - ${assessmentInfo.userName || '-'} - ${assessmentInfo.disabilityType || '-'}`}
                disabled
              />
            </Form.Item>
          )}

          <Form.Item
            label="方案名称"
            name="plan_name"
            rules={[{ required: true, message: '请输入方案名称' }]}
          >
            <Input placeholder="请输入方案名称" maxLength={100} />
          </Form.Item>

          <Form.Item
            label="方案描述"
            name="plan_description"
            rules={[{ required: true, message: '请输入方案描述' }]}
          >
            <TextArea rows={3} placeholder="请简要描述方案的适用场景和目的..." showCount maxLength={300} />
          </Form.Item>

          <Divider />

          <div className="detail-title">
            <Space>
              推荐器具列表
              <Button
                type="primary"
                size="small"
                icon={<AppstoreOutlined />}
                onClick={() => {
                  fetchDeviceList()
                  setDeviceModalVisible(true)
                }}
                disabled={!isEdit && !selectedAssessmentId}
              >
                从设备库选择
              </Button>
            </Space>
          </div>

          {selectedDevices.length > 0 ? (
            <>
              <Table
                columns={deviceColumns}
                dataSource={selectedDevices}
                rowKey="device_id"
                pagination={false}
                size="small"
              />
              <div style={{ textAlign: 'right', padding: '16px 0', fontSize: 16 }}>
                <span style={{ color: '#666', marginRight: 12 }}>总金额：</span>
                <span style={{ fontSize: 24, fontWeight: 'bold', color: '#f5222d' }}>
                  ¥{totalPrice.toLocaleString()}
                </span>
              </div>
            </>
          ) : (
            <Empty description="暂无器具，点击上方按钮从设备库选择" style={{ padding: '40px 0' }} />
          )}

          <Divider />

          <div className="detail-title">方案说明</div>

          <Form.Item
            label="使用说明"
            name="usage_instructions"
            rules={[{ required: true, message: '请填写使用说明' }]}
          >
            <TextArea rows={4} placeholder="请详细描述器具的使用方法和步骤..." showCount maxLength={500} />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="注意事项"
                name="precautions"
                rules={[{ required: true, message: '请填写注意事项' }]}
              >
                <TextArea rows={3} placeholder="请描述使用过程中的注意事项..." showCount maxLength={300} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="预期效果"
                name="estimated_effect"
                rules={[{ required: true, message: '请填写预期效果' }]}
              >
                <TextArea rows={3} placeholder="请描述使用方案后预期达到的效果..." showCount maxLength={300} />
              </Form.Item>
            </Col>
          </Row>

          <Divider />

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button size="large" onClick={() => navigate('/plans')}>
                取消
              </Button>
              <Button type="primary" size="large" htmlType="submit" loading={submitting} icon={<SaveOutlined />} disabled={!isEdit && !selectedAssessmentId}>
                {isEdit ? '保存修改' : '创建方案'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>

      <Modal
        title="从设备库选择器具"
        open={deviceModalVisible}
        onCancel={() => setDeviceModalVisible(false)}
        width={800}
        footer={null}
      >
        <div style={{ marginBottom: 16 }}>
          <Space>
            <Select
              placeholder="选择分类"
              style={{ width: 160 }}
              allowClear
              onChange={(value) => fetchDeviceList({ category: value })}
            >
              {categories.map(cat => (
                <Option key={cat.id || cat.name} value={cat.name || cat.id}>{cat.name || cat.label}</Option>
              ))}
            </Select>
            <Input.Search
              placeholder="搜索器具名称"
              style={{ width: 240 }}
              onSearch={(value) => fetchDeviceList({ keyword: value })}
              allowClear
            />
          </Space>
        </div>
        <Table
          columns={modalDeviceColumns}
          dataSource={deviceList}
          rowKey="id"
          loading={deviceLoading}
          pagination={false}
          scroll={{ y: 400 }}
          size="small"
        />
      </Modal>
    </div>
  )
}

export default PlanForm
