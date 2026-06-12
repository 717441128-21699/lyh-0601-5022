import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Form, Input, Select, InputNumber, Button, Card, message, Space, Divider, Row, Col } from 'antd'
import { ArrowLeftOutlined, SaveOutlined, PlusOutlined, MinusCircleOutlined } from '@ant-design/icons'
import { deviceAPI } from '../../services/api'
import { DISABILITY_TYPES } from '../../utils/constants'

const { TextArea } = Input
const { Option } = Select

const CATEGORIES = [
  { value: '轮椅', label: '轮椅' },
  { value: '助行器具', label: '助行器具' },
  { value: '康复辅具', label: '康复辅具' },
  { value: '假肢矫形', label: '假肢矫形' },
  { value: '视听辅助', label: '视听辅助' },
  { value: '生活自助', label: '生活自助' }
]

const SUBCATEGORIES = {
  '轮椅': ['电动轮椅', '手动轮椅', '运动轮椅', '轻便轮椅'],
  '助行器具': ['助行器', '拐杖', '手杖', '助行架'],
  '康复辅具': ['矫形器', '牵引器', '按摩器', '康复训练器'],
  '假肢矫形': ['上肢假肢', '下肢假肢', '矫形鞋垫', '脊柱矫形器'],
  '视听辅助': ['助听器', '助视器', '盲文设备', '语音提示器'],
  '生活自助': ['进食器具', '穿衣辅具', '洗浴辅具', '如厕辅具']
}

const DeviceForm = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const isEdit = !!id

  const fetchDetail = async () => {
    setLoading(true)
    try {
      const res = await deviceAPI.getDeviceDetail(id)
      if (res.code === 200) {
        const data = res.data
        const specs = data.specs ? Object.entries(data.specs).map(([key, value]) => ({ key, value })) : []
        form.setFieldsValue({
          ...data,
          specs
        })
      }
    } catch (error) {
      console.error('获取设备详情失败:', error)
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
      const specsObj = {}
      if (values.specs) {
        values.specs.forEach(item => {
          if (item.key) {
            specsObj[item.key] = item.value
          }
        })
      }

      const submitData = {
        ...values,
        specs: specsObj
      }
      delete submitData.specs

      let res
      if (isEdit) {
        res = await deviceAPI.updateDevice(id, submitData)
      } else {
        res = await deviceAPI.createDevice(submitData)
      }

      if (res.code === 200) {
        message.success(isEdit ? '更新成功' : '创建成功')
        navigate('/devices')
      }
    } catch (error) {
      console.error('提交失败:', error)
    } finally {
      setSubmitting(false)
    }
  }

  const selectedCategory = Form.useWatch('category', form)
  const subcategoryOptions = selectedCategory ? (SUBCATEGORIES[selectedCategory] || []).map(item => ({ value: item, label: item })) : []

  return (
    <div className="form-container">
      <Button
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate('/devices')}
        style={{ marginBottom: 20 }}
      >
        返回列表
      </Button>

      <div className="page-title">{isEdit ? '编辑设备' : '新增设备'}</div>

      <Card loading={loading}>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{ status: 'offline', stock: 0 }}
        >
          <div className="detail-title">基本信息</div>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="设备名称"
                name="name"
                rules={[{ required: true, message: '请输入设备名称' }]}
              >
                <Input placeholder="请输入设备名称" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="品牌"
                name="brand"
              >
                <Input placeholder="请输入品牌" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                label="分类"
                name="category"
                rules={[{ required: true, message: '请选择分类' }]}
              >
                <Select
                  placeholder="请选择分类"
                  onChange={() => form.setFieldsValue({ subcategory: undefined })}
                >
                  {CATEGORIES.map(item => (
                    <Option key={item.value} value={item.value}>{item.label}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="子分类"
                name="subcategory"
                rules={[{ required: true, message: '请选择子分类' }]}
              >
                <Select placeholder="请选择子分类">
                  {subcategoryOptions.map(item => (
                    <Option key={item.value} value={item.value}>{item.label}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="状态"
                name="status"
                rules={[{ required: true, message: '请选择状态' }]}
              >
                <Select placeholder="请选择状态">
                  <Option value="online">已上架</Option>
                  <Option value="offline">已下架</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="价格 (元)"
                name="price"
                rules={[{ required: true, message: '请输入价格' }]}
              >
                <InputNumber
                  min={0}
                  style={{ width: '100%' }}
                  placeholder="请输入价格"
                  formatter={(value) => `¥ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={(value) => value.replace(/\¥\s?|(,*)/g, '')}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="库存"
                name="stock"
                rules={[{ required: true, message: '请输入库存' }]}
              >
                <InputNumber
                  min={0}
                  style={{ width: '100%' }}
                  placeholder="请输入库存数量"
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            label="适用残疾类型"
            name="disabilityTypes"
            rules={[{ required: true, message: '请选择适用残疾类型' }]}
          >
            <Select
              mode="multiple"
              placeholder="请选择适用残疾类型"
              optionFilterProp="children"
              filterOption
            >
              {DISABILITY_TYPES.map(item => (
                <Option key={item.value} value={item.value}>{item.label}</Option>
              ))}
            </Select>
          </Form.Item>

          <Divider />

          <div className="detail-title">产品描述</div>

          <Form.Item
            label="设备描述"
            name="description"
            rules={[{ required: true, message: '请输入设备描述' }]}
          >
            <TextArea
              rows={4}
              placeholder="请输入设备描述"
              showCount
              maxLength={1000}
            />
          </Form.Item>

          <Divider />

          <div className="detail-title">规格参数</div>

          <Form.List name="specs">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...restField }) => (
                  <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                    <Form.Item
                      {...restField}
                      name={[name, 'key']}
                      rules={[{ required: true, message: '请输入参数名' }]}
                      style={{ width: 200, marginBottom: 0 }}
                    >
                      <Input placeholder="参数名" />
                    </Form.Item>
                    <Form.Item
                      {...restField}
                      name={[name, 'value']}
                      rules={[{ required: true, message: '请输入参数值' }]}
                      style={{ width: 300, marginBottom: 0 }}
                    >
                      <Input placeholder="参数值" />
                    </Form.Item>
                    <MinusCircleOutlined onClick={() => remove(name)} style={{ color: '#ff4d4f' }} />
                  </Space>
                ))}
                <Form.Item>
                  <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                    添加规格参数
                  </Button>
                </Form.Item>
              </>
            )}
          </Form.List>

          <Divider />

          <div className="detail-title">使用说明</div>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="适用条件"
                name="applicableConditions"
              >
                <TextArea
                  rows={4}
                  placeholder="请输入适用条件"
                  showCount
                  maxLength={500}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="禁忌症"
                name="contraindications"
              >
                <TextArea
                  rows={4}
                  placeholder="请输入禁忌症"
                  showCount
                  maxLength={500}
                />
              </Form.Item>
            </Col>
          </Row>

          <Divider />

          <div className="detail-title">图片设置</div>

          <Form.Item
            label="主图URL"
            name="image"
            rules={[{ required: true, message: '请输入主图URL' }]}
          >
            <Input placeholder="请输入图片URL地址" />
          </Form.Item>

          <Form.Item
            label="轮播图URL"
            name="images"
            extra="多个图片URL用英文逗号分隔"
          >
            <TextArea
              rows={3}
              placeholder="请输入轮播图URL，多个用英文逗号分隔"
            />
          </Form.Item>

          <Divider />

          <Form.Item style={{ marginBottom: 0, textAlign: 'center' }}>
            <Space size="large">
              <Button type="primary" htmlType="submit" loading={submitting} size="large" icon={<SaveOutlined />}>
                {isEdit ? '保存修改' : '创建设备'}
              </Button>
              <Button size="large" onClick={() => navigate('/devices')}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}

export default DeviceForm
