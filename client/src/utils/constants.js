export const ROLE_MAP = {
  disabled: { label: '残障人士', color: 'blue' },
  adapter: { label: '适配师', color: 'green' },
  therapist: { label: '康复师', color: 'purple' },
  finance: { label: '财务', color: 'orange' },
  admin: { label: '管理员', color: 'red' }
}

export const ASSESSMENT_STATUS_MAP = {
  pending: { label: '待处理', color: 'orange' },
  processing: { label: '处理中', color: 'blue' },
  completed: { label: '已完成', color: 'green' },
  cancelled: { label: '已取消', color: 'red' }
}

export const PLAN_STATUS_MAP = {
  draft: { label: '草稿', color: 'default' },
  confirmed: { label: '已确认', color: 'green' },
  rejected: { label: '已拒绝', color: 'red' },
  modified: { label: '已修改', color: 'orange' }
}

export const ORDER_STATUS_MAP = {
  pending: { label: '待确认', color: 'orange' },
  confirmed: { label: '已确认', color: 'blue' },
  processing: { label: '处理中', color: 'purple' },
  shipped: { label: '已发货', color: 'cyan' },
  delivered: { label: '已送达', color: 'geekblue' },
  completed: { label: '已完成', color: 'green' },
  cancelled: { label: '已取消', color: 'red' },
  refunded: { label: '已退款', color: 'default' }
}

export const PAYMENT_STATUS_MAP = {
  unpaid: { label: '未支付', color: 'red' },
  paid: { label: '已支付', color: 'green' },
  refunded: { label: '已退款', color: 'default' }
}

export const TRAINING_PLAN_STATUS_MAP = {
  active: { label: '进行中', color: 'green' },
  completed: { label: '已完成', color: 'blue' },
  suspended: { label: '已暂停', color: 'orange' },
  cancelled: { label: '已取消', color: 'red' }
}

export const APPOINTMENT_STATUS_MAP = {
  pending: { label: '待确认', color: 'orange' },
  confirmed: { label: '已确认', color: 'green' },
  cancelled: { label: '已取消', color: 'red' },
  completed: { label: '已完成', color: 'blue' },
  no_show: { label: '未到场', color: 'default' }
}

export const APPOINTMENT_TYPE_MAP = {
  evaluation: { label: '评估', color: 'blue' },
  training: { label: '训练', color: 'green' },
  consultation: { label: '咨询', color: 'purple' }
}

export const DISABILITY_TYPES = [
  { value: '肢体残疾', label: '肢体残疾' },
  { value: '视力残疾', label: '视力残疾' },
  { value: '听力残疾', label: '听力残疾' },
  { value: '言语残疾', label: '言语残疾' },
  { value: '智力残疾', label: '智力残疾' },
  { value: '精神残疾', label: '精神残疾' }
]

export const DISABILITY_LEVELS = [
  { value: '一级', label: '一级' },
  { value: '二级', label: '二级' },
  { value: '三级', label: '三级' },
  { value: '四级', label: '四级' }
]

export const NOTIFICATION_TYPE_MAP = {
  assessment: '评估通知',
  plan: '方案通知',
  order: '订单通知',
  training: '训练通知',
  appointment: '预约通知',
  finance: '财务通知',
  system: '系统通知'
}
