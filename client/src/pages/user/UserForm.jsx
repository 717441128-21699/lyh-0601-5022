import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Form, Input, Select, InputNumber, Button, Card, message, Space, Divider, Row, Col, Radio } from 'antd'
import { ArrowLeftOutlined, SaveOutlined } from '@ant-design/icons'
import { userAPI } from '../../services/api'
import { ROLE_MAP, DISABILITY_TYPES, DISABILITY_LEVELS } from '../../utils/constants'

const { TextArea } = Input
const { Option } = Select
const { Group: RadioGroup } = Radio

const UserForm = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const isEdit = !!id

  const selectedRole = Form.useWatch('role', form)

  const fetchDetail = async () => {
    setLoading(true)
    try {
      const res = await userAPI.getUserDetail(id)
      if (res.code === 200) {
        const data = res.data
        form.setFieldsValue(data)
      }
    } catch (error) {
      console.error('获取用户详情失败:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isEdit) {
      fetchDetail()
    }
  }, [id])

  const handleSubmit = async (values) => {
    setSubmitting(true)
    try {
      const submitData = { ...values }

      if (!isEdit && !submitData.password) {
        message.error('请输入密码')
        setSubmitting(false)
        return
      }

      if (isEdit && !submitData.password) {
        delete submitData.password
      }

      let res
      if (isEdit) {
        res = await userAPI.updateUser(id, submitData)
      } else {
        res = await userAPI.createUser(submitData)
      }

      if (res.code === 200) {
        message.success(isEdit ? '更新成功' : '创建成功')
        navigate('/users')
      }
    } catch (error) {
      console.error('提交失败:', error)
    } finally {
      setSubmitting(false)
    }
  }

  const renderDisabledForm = () => (
    <>
      <Divider />
      <div className="detail-title">残障人士信息</div>
      <Row gutter={16}>
        <Col span={12}>
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
        </Col>
        <Col span={12}>
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
        </Col>
      </Row>
      <Row gutter={16}>
        <Col span={8}>
          <Form.Item
            label="身高 (cm)"
            name="height"
          >
            <InputNumber min={50} max={250} style={{ width: '100%' }} placeholder="请输入身高" />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item
            label="体重 (kg)"
            name="weight"
          >
            <InputNumber min={10} max={200} style={{ width: '100%' }} placeholder="请输入体重" />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item
            label="年龄"
            name="age"
          >
            <InputNumber min={1} max={120} style={{ width: '100%' }} placeholder="请输入年龄" />
          </Form.Item>
        </Col>
      </Row>
      <Form.Item
        label="性别"
        name="gender"
      >
        <RadioGroup>
          <Radio value="male">男</Radio>
          <Radio value="female">女</Radio>
        </RadioGroup>
      </Form.Item>
    </>
  )

  const renderAdapterForm = () => (
    <>
      <Divider />
      <div className="detail-title">适配师信息</div>
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            label="执业证号"
            name="licenseNumber"
            rules={[{ required: true, message: '请输入执业证号' }]}
          >
            <Input placeholder="请输入执业证号" />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            label="从业年限"
            name="experienceYears"
            rules={[{ required: true, message: '请输入从业年限' }]}
          >
            <InputNumber min={0} max={60} style={{ width: '100%' }} placeholder="请输入从业年限" />
          </Form.Item>
        </Col>
      </Row>
      <Form.Item
        label="专长"
        name="specialty"
        rules={[{ required: true, message: '请输入专长' }]}
      >
        <Input placeholder="请输入专长领域，如：轮椅适配、假肢适配等" />
      </Form.Item>
      <Form.Item
        label="工作区域"
        name="workArea"
        rules={[{ required: true, message: '请输入工作区域' }]}
      >
        <Input placeholder="请输入工作区域" />
      </Form.Item>
    </>
  )

  const renderTherapistForm = () => (
    <>
      <Divider />
      <div className="detail-title">康复师信息</div>
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            label="执业证号"
            name="licenseNumber"
            rules={[{ required: true, message: '请输入执业证号' }]}
          >
            <Input placeholder="请输入执业证号" />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            label="从业年限"
            name="experienceYears"
            rules={[{ required: true, message: '请输入从业年限' }]}
          >
            <InputNumber min={0} max={60} style={{ width: '100%' }} placeholder="请输入从业年限" />
          </Form.Item>
        </Col>
      </Row>
      <Form.Item
        label="专长"
        name="specialty"
        rules={[{ required: true, message: '请输入专长' }]}
      >
        <Input placeholder="请输入专长领域，如：运动康复、物理治疗等" />
      </Form.Item>
      <Form.Item
        label="工作地址"
        name="workAddress"
        rules={[{ required: true, message: '请输入工作地址' }]}
      >
        <Input placeholder="请输入工作地址" />
      </Form.Item>
      <Form.Item
        label="工作时间"
        name="workTime"
        rules={[{ required: true, message: '请输入工作时间' }]}
      >
        <Input placeholder="请输入工作时间，如：周一至周五 9:00-18:00" />
      </Form.Item>
    </>
  )

  const renderRoleForm = () => {
    switch (selectedRole) {
      case 'disabled':
        return renderDisabledForm()
      case 'adapter':
        return renderAdapterForm()
      case 'therapist':
        return renderTherapistForm()
      default:
        return null
    }
  }

  return (
    <div className="form-container">
      <Button
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate('/users')}
        style={{ marginBottom: 20 }}
      >
        返回列表
      </Button>

      <div className="page-title">{isEdit ? '编辑用户' : '新增用户'}</div>

      <Card loading={loading}>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{ status: 'active' }}
        >
          <div className="detail-title">基本信息</div>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="用户名"
                name="username"
                rules={[{ required: true, message: '请输入用户名' }]}
              >
                <Input placeholder="请输入用户名" disabled={isEdit} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="姓名"
                name="name"
                rules={[{ required: true, message: '请输入姓名' }]}
              >
                <Input placeholder="请输入姓名" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="手机号"
                name="phone"
                rules={[{ required: true, message: '请输入手机号' }]}
              >
                <Input placeholder="请输入手机号" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="邮箱"
                name="email"
                rules={[
                  { type: 'email', message: '请输入有效的邮箱地址' }
                ]}
              >
                <Input placeholder="请输入邮箱" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="角色"
                name="role"
                rules={[{ required: true, message: '请选择角色' }]}
              >
                <Select placeholder="请选择角色" disabled={isEdit}>
                  {Object.entries(ROLE_MAP).map(([key, value]) => (
                    <Option key={key} value={key}>{value.label}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="状态"
                name="status"
                rules={[{ required: true, message: '请选择状态' }]}
              >
                <Select placeholder="请选择状态">
                  <Option value="active">正常</Option>
                  <Option value="disabled">禁用</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            label={isEdit ? '密码（留空则不修改）' : '密码'}
            name="password"
            rules={isEdit ? [] : [{ required: true, message: '请输入密码' }]}
          >
            <Input.Password placeholder={isEdit ? '请输入新密码（留空不修改）' : '请输入密码'} />
          </Form.Item>

          {renderRoleForm()}

          <Divider />

          <Form.Item style={{ marginBottom: 0, textAlign: 'center' }}>
            <Space size="large">
              <Button type="primary" htmlType="submit" loading={submitting} size="large" icon={<SaveOutlined />}>
                {isEdit ? '保存修改' : '创建用户'}
              </Button>
              <Button size="large" onClick={() => navigate('/users')}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}

export default UserForm
