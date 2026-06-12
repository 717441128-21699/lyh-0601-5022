import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Button,
  Card,
  Form,
  Select,
  DatePicker,
  Space,
  message,
  List,
  Tag,
  Spin,
  Empty,
  Row,
  Col,
  Input
} from 'antd'
import {
  ArrowLeftOutlined,
  UserOutlined,
  EnvironmentOutlined,
  ClockCircleOutlined,
  StarOutlined
} from '@ant-design/icons'
import { appointmentAPI } from '../../services/api'
import useUserStore from '../../store/useUserStore'
import { APPOINTMENT_TYPE_MAP } from '../../utils/constants'
import dayjs from 'dayjs'

const { Option } = Select
const { TextArea } = Input

const AppointmentForm = () => {
  const navigate = useNavigate()
  const { user } = useUserStore()
  const [form] = Form.useForm()
  const [recommending, setRecommending] = useState(false)
  const [availableSlots, setAvailableSlots] = useState([])
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const handleSearchSlots = async () => {
    try {
      const values = await form.validateFields(['type', 'date'])
      setRecommending(true)
      const res = await appointmentAPI.getAvailable({
        specialty: values.type,
        date: values.date.format('YYYY-MM-DD')
      })
      if (res.code === 200) {
        const slots = res.data.list || []
        slots.sort((a, b) => (a.distance || 0) - (b.distance || 0))
        setAvailableSlots(slots)
        setSelectedSlot(null)
      }
    } catch (error) {
      if (error.errorFields) {
        return
      }
      console.error('获取可用时段失败:', error)
    } finally {
      setRecommending(false)
    }
  }

  const handleSubmit = async () => {
    if (!selectedSlot) {
      message.warning('请选择一个时段')
      return
    }
    try {
      const values = await form.validateFields()
      const dateStr = form.getFieldValue('date').format('YYYY-MM-DD')
      setSubmitting(true)
      const res = await appointmentAPI.create({
        therapist_id: selectedSlot.id,
        appointment_time: `${dateStr} ${selectedSlot.startTime}`,
        duration: 60,
        service_type: values.type,
        notes: values.remark
      })
      if (res.code === 200) {
        message.success('预约创建成功')
        navigate(`/appointments/${res.data?.id || res.data}`)
      }
    } catch (error) {
      if (error.errorFields) {
        return
      }
      console.error('创建预约失败:', error)
    } finally {
      setSubmitting(false)
    }
  }

  const handleSlotSelect = (slot) => {
    setSelectedSlot(slot)
  }

  return (
    <div>
      <Button
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate('/appointments')}
        style={{ marginBottom: 20 }}
      >
        返回列表
      </Button>

      <div className="page-title">创建预约（智能推荐）</div>

      <Card className="detail-card">
        <Form
          form={form}
          layout="vertical"
          className="form-container"
        >
          <Row gutter={24}>
            <Col span={12}>
              <Form.Item
                name="type"
                label="预约类型"
                rules={[{ required: true, message: '请选择预约类型' }]}
              >
                <Select placeholder="请选择预约类型">
                  {Object.entries(APPOINTMENT_TYPE_MAP).map(([key, value]) => (
                    <Option key={key} value={key}>{value.label}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="date"
                label="选择日期"
                rules={[{ required: true, message: '请选择日期' }]}
              >
                <DatePicker
                  style={{ width: '100%' }}
                  placeholder="请选择日期"
                  disabledDate={(current) => current && current < dayjs().startOf('day')}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="remark"
            label="备注说明"
          >
            <TextArea
              rows={3}
              placeholder="请输入备注说明（选填）"
              maxLength={200}
              showCount
            />
          </Form.Item>

          <Form.Item>
            <Button type="primary" onClick={handleSearchSlots} loading={recommending}>
              智能推荐时段
            </Button>
          </Form.Item>
        </Form>
      </Card>

      <Card
        className="detail-card"
        title={
          <Space>
            <StarOutlined style={{ color: '#faad14' }} />
            智能推荐时段
            <Tag color="green">距离优先</Tag>
          </Space>
        }
      >
        {recommending ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <Spin tip="正在为您推荐合适的康复师和时段..." />
          </div>
        ) : availableSlots.length === 0 ? (
          <Empty description="请先选择预约类型和日期，点击智能推荐" />
        ) : (
          <div>
            {availableSlots.map((therapist, index) => (
              <div key={therapist.id} style={{ marginBottom: 16 }}>
                <div className="recommendation-item">
                  <div className="recommendation-score">
                    {index + 1}
                  </div>
                  <div className="recommendation-info">
                    <div className="recommendation-name">
                      <Space>
                        <UserOutlined />
                        {therapist.realName}
                      </Space>
                    </div>
                    <div className="recommendation-desc">
                      <Space size="large">
                        <span>
                          <EnvironmentOutlined style={{ marginRight: 4 }} />
                          {therapist.distance}公里
                        </span>
                        <span>
                          <StarOutlined style={{ color: '#faad14', marginRight: 4 }} />
                          {therapist.experienceYears || '5'}年经验
                        </span>
                        <span>{therapist.workAddress}</span>
                      </Space>
                    </div>
                  </div>
                </div>
                <div style={{ padding: '0 0 0 76px' }}>
                  <List
                    grid={{ gutter: 8, xs: 2, sm: 3, md: 4, lg: 6 }}
                    dataSource={therapist.availableSlots || []}
                    renderItem={(slot) => {
                      const isSelected = selectedSlot?.startTime === slot.startTime && selectedSlot?.id === therapist.id
                      return (
                        <List.Item>
                          <div
                            onClick={() => handleSlotSelect({
                              id: therapist.id,
                              realName: therapist.realName,
                              workAddress: therapist.workAddress,
                              distance: therapist.distance,
                              startTime: slot.startTime
                            })}
                            style={{ 
                              padding: '8px 12px', 
                              border: `2px solid ${isSelected ? '#1890ff' : '#e8e8e8'}`, 
                              borderRadius: 6,
                              textAlign: 'center',
                              background: isSelected ? '#e6f7ff' : '#fff',
                              cursor: 'pointer',
                              transition: 'all 0.3s'
                            }}
                          >
                            <ClockCircleOutlined style={{ marginRight: 4, color: isSelected ? '#1890ff' : '' }} />
                            <span style={{ color: isSelected ? '#1890ff' : '', fontWeight: isSelected ? 600 : 400 }}>
                              {slot.startTime.substring(0, 5)}
                            </span>
                          </div>
                        </List.Item>
                      )
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {availableSlots.length > 0 && (
          <div style={{ textAlign: 'center', marginTop: 24 }}>
            <Space size="large">
              <Button onClick={() => navigate('/appointments')}>
                取消
              </Button>
              <Button
                type="primary"
                size="large"
                loading={submitting}
                onClick={handleSubmit}
                disabled={!selectedSlot}
              >
                确认预约
              </Button>
            </Space>
          </div>
        )}
      </Card>
    </div>
  )
}

export default AppointmentForm
