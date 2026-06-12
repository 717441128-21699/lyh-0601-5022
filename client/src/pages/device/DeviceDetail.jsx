import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Button, Card, Tag, Descriptions, Space, Row, Col, Image, Divider, List } from 'antd'
import { ArrowLeftOutlined, EditOutlined } from '@ant-design/icons'
import { deviceAPI } from '../../services/api'
import dayjs from 'dayjs'

const DeviceDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [detail, setDetail] = useState(null)

  const fetchDetail = async () => {
    setLoading(true)
    try {
      const res = await deviceAPI.getDeviceDetail(id)
      if (res.code === 200) {
        setDetail(res.data)
      }
    } catch (error) {
      console.error('获取设备详情失败:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDetail()
  }, [id])

  const statusMap = {
    online: { label: '已上架', color: 'green' },
    offline: { label: '已下架', color: 'default' }
  }

  const statusInfo = detail ? (statusMap[detail.status] || { label: detail.status, color: 'default' }) : { label: '-', color: 'default' }

  const specsList = detail?.specs ? Object.entries(detail.specs) : []
  const disabilityTypes = detail?.disabilityTypes || []
  const images = detail?.images ? detail.images.split(',').filter(Boolean) : []

  return (
    <div>
      <Button
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate('/devices')}
        style={{ marginBottom: 20 }}
      >
        返回列表
      </Button>

      <div className="page-title">
        <Space>
          设备详情
          <Tag color={statusInfo.color}>{statusInfo.label}</Tag>
        </Space>
        <Button
          type="primary"
          size="small"
          icon={<EditOutlined />}
          style={{ float: 'right' }}
          onClick={() => navigate(`/devices/${id}/edit`)}
        >
          编辑
        </Button>
      </div>

      <Card loading={loading} className="detail-card">
        <Row gutter={24}>
          <Col span={8}>
            {detail?.image ? (
              <Image
                width="100%"
                height={240}
                src={detail.image}
                style={{ objectFit: 'cover', borderRadius: 8 }}
              />
            ) : (
              <div style={{ width: '100%', height: 240, background: '#f5f5f5', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>
                暂无图片
              </div>
            )}
          </Col>
          <Col span={16}>
            <div style={{ fontSize: 20, fontWeight: 600, marginBottom: 12, color: '#1a1a2e' }}>
              {detail?.name || '-'}
            </div>
            <div style={{ fontSize: 28, fontWeight: 'bold', color: '#f5222d', marginBottom: 16 }}>
              ¥{detail?.price ? Number(detail.price).toLocaleString() : '0'}
            </div>
            <Space size="small" style={{ marginBottom: 16 }}>
              {detail?.category && <Tag color="blue">{detail.category}</Tag>}
              {detail?.subcategory && <Tag color="geekblue">{detail.subcategory}</Tag>}
              {detail?.brand && <Tag color="default">{detail.brand}</Tag>}
            </Space>
            <Descriptions column={2} size="small" style={{ marginBottom: 0 }}>
              <Descriptions.Item label="库存">{detail?.stock || 0}</Descriptions.Item>
              <Descriptions.Item label="创建时间">
                {detail?.createdAt ? dayjs(detail.createdAt).format('YYYY-MM-DD HH:mm') : '-'}
              </Descriptions.Item>
            </Descriptions>
          </Col>
        </Row>
      </Card>

      <Card className="detail-card" title="适用残疾类型">
        <Space size="small">
          {disabilityTypes.length > 0 ? (
            disabilityTypes.map((type, index) => (
              <Tag key={index} color="green">{type}</Tag>
            ))
          ) : (
            <span style={{ color: '#999' }}>暂无</span>
          )}
        </Space>
      </Card>

      <Card className="detail-card" title="规格参数">
        {specsList.length > 0 ? (
          <Row gutter={16}>
            {specsList.map(([key, value]) => (
              <Col span={12} key={key}>
                <div className="detail-item">
                  <div className="detail-label">{key}</div>
                  <div className="detail-value">{value}</div>
                </div>
              </Col>
            ))}
          </Row>
        ) : (
          <div style={{ color: '#999' }}>暂无规格参数</div>
        )}
      </Card>

      <Card className="detail-card" title="设备描述">
        <div style={{ color: '#333', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
          {detail?.description || '暂无描述'}
        </div>
      </Card>

      <Card className="detail-card" title="使用说明">
        <Row gutter={24}>
          <Col span={12}>
            <div className="detail-title" style={{ fontSize: 14, marginTop: 0, paddingBottom: 8, marginBottom: 12 }}>适用条件</div>
            <div style={{ color: '#333', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
              {detail?.applicableConditions || '暂无'}
            </div>
          </Col>
          <Col span={12}>
            <div className="detail-title" style={{ fontSize: 14, marginTop: 0, paddingBottom: 8, marginBottom: 12 }}>禁忌症</div>
            <div style={{ color: '#333', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
              {detail?.contraindications || '暂无'}
            </div>
          </Col>
        </Row>
      </Card>

      {images.length > 0 && (
        <Card className="detail-card" title="产品图集">
          <Row gutter={16}>
            {images.map((img, index) => (
              <Col span={6} key={index}>
                <Image
                  width="100%"
                  height={120}
                  src={img}
                  style={{ objectFit: 'cover', borderRadius: 4 }}
                />
              </Col>
            ))}
          </Row>
        </Card>
      )}
    </div>
  )
}

export default DeviceDetail
