import React, { useState, useEffect } from 'react'
import {
  Card,
  Form,
  Input,
  Button,
  Avatar,
  Row,
  Col,
  Descriptions,
  Tabs,
  InputNumber,
  Select,
  message,
  Divider,
  Upload
} from 'antd'
import {
  UserOutlined,
  EditOutlined,
  LockOutlined,
  SaveOutlined,
  UploadOutlined
} from '@ant-design/icons'
import useUserStore from '../store/useUserStore'
import { userAPI, authAPI } from '../services/api'
import { ROLE_MAP, DISABILITY_TYPES, DISABILITY_LEVELS } from '../utils/constants'

const { TextArea } = Input
const { Option } = Select

const Profile = () => {
  const { user, updateUser } = useUserStore()
  const [loading, setLoading] = useState(false)
  const [profileForm] = Form.useForm()
  const [passwordForm] = Form.useForm()
  const [activeTab, setActiveTab] = useState('info')
  const [profileData, setProfileData] = useState(null)

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      const res = await authAPI.getProfile()
      const data = res.data
      setProfileData(data)
      profileForm.setFieldsValue(data)
    } catch (error) {
      console.error('获取用户信息失败:', error)
    }
  }

  const handleUpdateProfile = async (values) => {
    try {
      setLoading(true)
      const res = await userAPI.updateProfile(values)
      message.success('修改成功')
      updateUser(res.data || values)
      setProfileData(prev => ({ ...prev, ...values }))
    } catch (error) {
      console.error('修改失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleChangePassword = async (values) => {
    try {
      setLoading(true)
      await userAPI.updateProfile({
        oldPassword: values.oldPassword,
        password: values.newPassword
      })
      message.success('密码修改成功')
      passwordForm.resetFields()
    } catch (error) {
      console.error('修改密码失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const tabItems = [
    {
      key: 'info',
      label: (
        <span>
          <UserOutlined />
          基本信息
        </span>
      )
    },
    {
      key: 'edit',
      label: (
        <span>
          <EditOutlined />
          编辑资料
        </span>
      )
    },
    {
      key: 'password',
      label: (
        <span>
          <LockOutlined />
          修改密码
        </span>
      )
    }
  ]

  const renderInfoTab = () => (
    <div style={{ padding: '24px 0' }}>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <Avatar
          size={96}
          icon={<UserOutlined />}
          src={profileData?.avatar}
          style={{ marginBottom: 16, backgroundColor: '#1890ff' }}
        />
        <h2 style={{ marginBottom: 8 }}>
          {profileData?.name || profileData?.username || '用户'}
        </h2>
        <p style={{ color: '#666', marginBottom: 0 }}>
          {ROLE_MAP[profileData?.role]?.label || '用户'}
        </p>
      </div>

      <Divider />

      <Descriptions
        title="基本信息"
        column={2}
        bordered
        size="middle"
      >
        <Descriptions.Item label="用户名">
          {profileData?.username || '-'}
        </Descriptions.Item>
        <Descriptions.Item label="姓名">
          {profileData?.name || '-'}
        </Descriptions.Item>
        <Descriptions.Item label="手机号">
          {profileData?.phone || '-'}
        </Descriptions.Item>
        <Descriptions.Item label="邮箱">
          {profileData?.email || '-'}
        </Descriptions.Item>
        <Descriptions.Item label="角色">
          {ROLE_MAP[profileData?.role]?.label || '-'}
        </Descriptions.Item>
        <Descriptions.Item label="性别">
          {profileData?.gender || '-'}
        </Descriptions.Item>
        <Descriptions.Item label="年龄">
          {profileData?.age || '-'}
        </Descriptions.Item>
        <Descriptions.Item label="注册时间">
          {profileData?.createdAt || '-'}
        </Descriptions.Item>
      </Descriptions>

      {profileData?.role === 'disabled' && (
        <>
          <Divider />
          <Descriptions
            title="残障信息"
            column={2}
            bordered
            size="middle"
          >
            <Descriptions.Item label="残疾类型">
              {profileData?.disabilityType || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="残疾等级">
              {profileData?.disabilityLevel || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="残疾证号">
              {profileData?.disabilityCardNo || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="联系地址">
              {profileData?.address || '-'}
            </Descriptions.Item>
          </Descriptions>
        </>
      )}
    </div>
  )

  const renderEditTab = () => (
    <div style={{ padding: '24px 0' }}>
      <Form
        form={profileForm}
        layout="vertical"
        onFinish={handleUpdateProfile}
        initialValues={profileData || {}}
      >
        <Row gutter={24}>
          <Col xs={24} md={12}>
            <Form.Item
              name="username"
              label="用户名"
              rules={[{ required: true, message: '请输入用户名' }]}
            >
              <Input disabled placeholder="请输入用户名" />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              name="name"
              label="姓名"
              rules={[{ required: true, message: '请输入姓名' }]}
            >
              <Input placeholder="请输入姓名" />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              name="phone"
              label="手机号"
              rules={[
                { required: true, message: '请输入手机号' },
                { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号' }
              ]}
            >
              <Input placeholder="请输入手机号" />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              name="email"
              label="邮箱"
              rules={[
                { type: 'email', message: '请输入正确的邮箱格式' }
              ]}
            >
              <Input placeholder="请输入邮箱" />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              name="gender"
              label="性别"
            >
              <Select placeholder="请选择性别">
                <Option value="男">男</Option>
                <Option value="女">女</Option>
                <Option value="其他">其他</Option>
              </Select>
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              name="age"
              label="年龄"
            >
              <InputNumber min={1} max={150} style={{ width: '100%' }} placeholder="请输入年龄" />
            </Form.Item>
          </Col>
        </Row>

        {user?.role === 'disabled' && (
          <>
            <Divider orientation="left">残障信息</Divider>
            <Row gutter={24}>
              <Col xs={24} md={12}>
                <Form.Item
                  name="disabilityType"
                  label="残疾类型"
                >
                  <Select placeholder="请选择残疾类型">
                    {DISABILITY_TYPES.map(item => (
                      <Option key={item.value} value={item.value}>
                        {item.label}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item
                  name="disabilityLevel"
                  label="残疾等级"
                >
                  <Select placeholder="请选择残疾等级">
                    {DISABILITY_LEVELS.map(item => (
                      <Option key={item.value} value={item.value}>
                        {item.label}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item
                  name="disabilityCardNo"
                  label="残疾证号"
                >
                  <Input placeholder="请输入残疾证号" />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item
                  name="address"
                  label="联系地址"
                >
                  <Input placeholder="请输入联系地址" />
                </Form.Item>
              </Col>
            </Row>
          </>
        )}

        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            loading={loading}
            icon={<SaveOutlined />}
          >
            保存修改
          </Button>
        </Form.Item>
      </Form>
    </div>
  )

  const renderPasswordTab = () => (
    <div style={{ padding: '24px 0', maxWidth: 500 }}>
      <Form
        form={passwordForm}
        layout="vertical"
        onFinish={handleChangePassword}
      >
        <Form.Item
          name="oldPassword"
          label="原密码"
          rules={[
            { required: true, message: '请输入原密码' },
            { min: 6, message: '密码至少6位' }
          ]}
        >
          <Input.Password placeholder="请输入原密码" />
        </Form.Item>

        <Form.Item
          name="newPassword"
          label="新密码"
          rules={[
            { required: true, message: '请输入新密码' },
            { min: 6, message: '密码至少6位' }
          ]}
        >
          <Input.Password placeholder="请输入新密码" />
        </Form.Item>

        <Form.Item
          name="confirmPassword"
          label="确认新密码"
          dependencies={['newPassword']}
          rules={[
            { required: true, message: '请确认新密码' },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('newPassword') === value) {
                  return Promise.resolve()
                }
                return Promise.reject(new Error('两次输入的密码不一致'))
              }
            })
          ]}
        >
          <Input.Password placeholder="请再次输入新密码" />
        </Form.Item>

        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            loading={loading}
            icon={<SaveOutlined />}
          >
            修改密码
          </Button>
        </Form.Item>
      </Form>
    </div>
  )

  return (
    <div>
      <div className="page-title">个人中心</div>

      <Card bordered={false}>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
        />

        {activeTab === 'info' && renderInfoTab()}
        {activeTab === 'edit' && renderEditTab()}
        {activeTab === 'password' && renderPasswordTab()}
      </Card>
    </div>
  )
}

export default Profile
