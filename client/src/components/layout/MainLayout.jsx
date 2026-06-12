import React, { useState, useEffect } from 'react'
import { Layout, Menu, Breadcrumb, Dropdown, Avatar, Badge, Button } from 'antd'
import {
  UserOutlined,
  LogoutOutlined,
  SettingOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined
} from '@ant-design/icons'
import { useNavigate, useLocation, Outlet } from 'react-router-dom'
import { getMenuByRole } from './MenuConfig'
import useUserStore from '../../store/useUserStore'
import { ROLE_MAP } from '../../utils/constants'
import { notificationAPI } from '../../services/api'

const { Header, Sider, Content } = Layout

const MainLayout = () => {
  const [collapsed, setCollapsed] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const user = useUserStore(state => state.user)
  const unreadCount = useUserStore(state => state.unreadCount)
  const setUnreadCount = useUserStore(state => state.setUnreadCount)
  const logout = useUserStore(state => state.logout)

  const menuItems = getMenuByRole(user?.role)

  useEffect(() => {
    fetchUnreadCount()
  }, [])

  const fetchUnreadCount = async () => {
    try {
      const res = await notificationAPI.getUnreadCount()
      setUnreadCount(res.data.count)
    } catch (error) {
      console.error('Failed to fetch unread count:', error)
    }
  }

  const handleMenuClick = ({ key }) => {
    navigate(key)
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const handleNotificationClick = () => {
    navigate('/notifications')
  }

  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: '个人中心',
      onClick: () => navigate('/profile')
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: '账号设置',
      onClick: () => navigate('/settings')
    },
    {
      type: 'divider'
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: handleLogout
    }
  ]

  const getBreadcrumbItems = () => {
    const pathSegments = location.pathname.split('/').filter(Boolean)
    const breadcrumbItems = [{ title: '首页', onClick: () => navigate('/dashboard') }]
    
    let currentPath = ''
    for (let i = 1; i < pathSegments.length; i++) {
      currentPath += '/' + pathSegments[i]
      const menuItem = menuItems.find(item => item.key === currentPath)
      if (menuItem) {
        breadcrumbItems.push({ title: menuItem.label })
      }
    }
    
    return breadcrumbItems
  }

  return (
    <Layout className="layout">
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        theme="dark"
      >
        <div className="sider-logo">
          {collapsed ? '适配' : '辅助器具适配平台'}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={handleMenuClick}
        />
      </Sider>
      <Layout>
        <Header className="header">
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              style={{ fontSize: '16px', width: 64, height: 64 }}
            />
            <Breadcrumb items={getBreadcrumbItems()} />
          </div>
          <div className="header-right">
            <Badge count={unreadCount} size="small">
              <Button
                type="text"
                icon={<span style={{ fontSize: '18px' }}>🔔</span>}
                onClick={handleNotificationClick}
              />
            </Badge>
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
              <div style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                <Avatar icon={<UserOutlined />} />
                <span style={{ marginLeft: 8 }}>
                  {user?.name || user?.username || '用户'}
                  <span style={{ 
                    color: '#666', 
                    fontSize: '12px', 
                    marginLeft: 8 
                  }}>
                    [{ROLE_MAP[user?.role]?.label || ''}]
                  </span>
                </span>
              </div>
            </Dropdown>
          </div>
        </Header>
        <Content className="content">
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  )
}

export default MainLayout
