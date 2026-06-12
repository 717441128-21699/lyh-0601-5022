import React, { useState } from 'react'
import { Form, Input, Button, Select, message } from 'antd'
import { UserOutlined, LockOutlined } from '@ant-design/icons'
import { useNavigate, Link } from 'react-router-dom'
import { authAPI } from '../services/api'
import useUserStore from '../store/useUserStore'
import { ROLE_MAP } from '../utils/constants'

const Login = () => {
  const [loading, setLoading] = useState(false)
  const [form] = Form.useForm()
  const navigate = useNavigate()
  const login = useUserStore(state => state.login)

  const handleLogin = async (values) => {
    setLoading(true)
    try {
      const res = await authAPI.login(values)
      login(res.data.user, res.data.token)
      message.success('登录成功')
      navigate('/dashboard')
    } catch (error) {
      console.error('Login error:', error)
    } finally {
      setLoading(false)
    }
  }

  const roleOptions = Object.entries(ROLE_MAP).map(([value, { label }]) => ({
    value,
    label
  }))

  return (
    <div className="login-container">
      <div className="login-box">
        <div className="login-title">
          <h2>辅助器具适配服务平台</h2>
          <p>欢迎登录，请输入您的账号信息</p>
        </div>
        <Form
          form={form}
          name="login"
          onFinish={handleLogin}
          size="large"
          initialValues={{ role: 'disabled' }}
        >
          <Form.Item
            name="username"
            rules={[{ required: true, message: '请输入账号' }]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="请输入账号"
            />
          </Form.Item>
          <Form.Item
            name="password"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="请输入密码"
            />
          </Form.Item>
          <Form.Item
            name="role"
            rules={[{ required: true, message: '请选择角色' }]}
          >
            <Select
              placeholder="请选择角色"
              options={roleOptions}
            />
          </Form.Item>
          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              block
            >
              登录
            </Button>
          </Form.Item>
          <div style={{ textAlign: 'center' }}>
            还没有账号？
            <Link to="/register">立即注册</Link>
          </div>
        </Form>
      </div>
    </div>
  )
}

export default Login
