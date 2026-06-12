import {
  HomeOutlined,
  FileTextOutlined,
  SolutionOutlined,
  ShoppingOutlined,
  PlayCircleOutlined,
  CalendarOutlined,
  BellOutlined,
  UserOutlined,
  ToolOutlined,
  BarChartOutlined,
  MoneyCollectOutlined,
  ScheduleOutlined
} from '@ant-design/icons'

const menuConfig = {
  disabled: [
    {
      key: '/dashboard',
      icon: <HomeOutlined />,
      label: '首页'
    },
    {
      key: '/assessments',
      icon: <FileTextOutlined />,
      label: '评估记录'
    },
    {
      key: '/plans',
      icon: <SolutionOutlined />,
      label: '适配方案'
    },
    {
      key: '/orders',
      icon: <ShoppingOutlined />,
      label: '我的订单'
    },
    {
      key: '/training',
      icon: <PlayCircleOutlined />,
      label: '训练计划'
    },
    {
      key: '/appointments',
      icon: <CalendarOutlined />,
      label: '我的预约'
    },
    {
      key: '/notifications',
      icon: <BellOutlined />,
      label: '消息通知'
    }
  ],
  adapter: [
    {
      key: '/dashboard',
      icon: <HomeOutlined />,
      label: '首页'
    },
    {
      key: '/assessments',
      icon: <FileTextOutlined />,
      label: '评估管理'
    },
    {
      key: '/plans',
      icon: <SolutionOutlined />,
      label: '适配方案'
    },
    {
      key: '/orders',
      icon: <ShoppingOutlined />,
      label: '订单管理'
    },
    {
      key: '/notifications',
      icon: <BellOutlined />,
      label: '消息通知'
    }
  ],
  therapist: [
    {
      key: '/dashboard',
      icon: <HomeOutlined />,
      label: '首页'
    },
    {
      key: '/training',
      icon: <PlayCircleOutlined />,
      label: '训练计划'
    },
    {
      key: '/appointments',
      icon: <CalendarOutlined />,
      label: '预约管理'
    },
    {
      key: '/training-records',
      icon: <ScheduleOutlined />,
      label: '训练记录'
    },
    {
      key: '/notifications',
      icon: <BellOutlined />,
      label: '消息通知'
    }
  ],
  finance: [
    {
      key: '/dashboard',
      icon: <HomeOutlined />,
      label: '首页'
    },
    {
      key: '/finance',
      icon: <MoneyCollectOutlined />,
      label: '财务记录'
    },
    {
      key: '/reports/monthly',
      icon: <BarChartOutlined />,
      label: '运营报表'
    },
    {
      key: '/notifications',
      icon: <BellOutlined />,
      label: '消息通知'
    }
  ],
  admin: [
    {
      key: '/dashboard',
      icon: <HomeOutlined />,
      label: '首页'
    },
    {
      key: '/users',
      icon: <UserOutlined />,
      label: '用户管理'
    },
    {
      key: '/devices',
      icon: <ToolOutlined />,
      label: '器具管理'
    },
    {
      key: '/assessments',
      icon: <FileTextOutlined />,
      label: '评估管理'
    },
    {
      key: '/plans',
      icon: <SolutionOutlined />,
      label: '方案管理'
    },
    {
      key: '/orders',
      icon: <ShoppingOutlined />,
      label: '订单管理'
    },
    {
      key: '/training',
      icon: <PlayCircleOutlined />,
      label: '训练管理'
    },
    {
      key: '/appointments',
      icon: <CalendarOutlined />,
      label: '预约管理'
    },
    {
      key: '/finance',
      icon: <MoneyCollectOutlined />,
      label: '财务管理'
    },
    {
      key: '/reports/monthly',
      icon: <BarChartOutlined />,
      label: '报表中心'
    },
    {
      key: '/notifications',
      icon: <BellOutlined />,
      label: '消息通知'
    }
  ]
}

export const getMenuByRole = (role) => {
  return menuConfig[role] || menuConfig.disabled
}

export default menuConfig
