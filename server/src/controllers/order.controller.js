const { query, getConnection } = require('../config/database');
const { successResponse, errorResponse, paginate } = require('../utils/helpers');
const { createNotification } = require('../services/notification.service');

async function getOrders(req, res) {
  try {
    const { page = 1, pageSize = 10, order_status, keyword } = req.query;
    const { limit, offset } = paginate(page, pageSize);

    let sql = 'SELECT o.*, u.real_name as user_name, a.real_name as adapter_name, p.plan_name as plan_name FROM orders o LEFT JOIN users u ON o.user_id = u.id LEFT JOIN users a ON o.adapter_id = a.id LEFT JOIN adaptation_plans p ON o.plan_id = p.id WHERE 1=1';
    const params = [];

    if (req.user.role === 'disabled') {
      sql += ' AND o.user_id = ?';
      params.push(req.user.id);
    } else if (req.user.role === 'adapter') {
      sql += ' AND o.adapter_id = ?';
      params.push(req.user.id);
    }

    if (order_status) {
      sql += ' AND o.order_status = ?';
      params.push(order_status);
    }

    if (keyword) {
      sql += ' AND (o.order_no LIKE ? OR p.plan_name LIKE ?)';
      params.push(`%${keyword}%`, `%${keyword}%`);
    }

    const countSql = sql.replace('SELECT o.*, u.real_name as user_name, a.real_name as adapter_name, p.plan_name as plan_name', 'SELECT COUNT(*) as total');
    const countResult = await query(countSql, params);
    const total = countResult[0].total;

    sql += ' ORDER BY o.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const orders = await query(sql, params);

    successResponse(res, {
      list: orders,
      total,
      page: parseInt(page),
      pageSize: parseInt(pageSize)
    }, '获取订单列表成功');
  } catch (error) {
    console.error('获取订单列表错误:', error);
    errorResponse(res, '获取订单列表失败', 500);
  }
}

async function getOrderDetail(req, res) {
  try {
    const { id } = req.params;

    const orders = await query(
      'SELECT o.*, u.real_name as user_name, a.real_name as adapter_name, p.plan_name as plan_name FROM orders o LEFT JOIN users u ON o.user_id = u.id LEFT JOIN users a ON o.adapter_id = a.id LEFT JOIN adaptation_plans p ON o.plan_id = p.id WHERE o.id = ?',
      [id]
    );

    if (orders.length === 0) {
      return errorResponse(res, '订单不存在', 404);
    }

    const order = orders[0];

    if (req.user.role === 'disabled' && order.user_id !== req.user.id) {
      return errorResponse(res, '权限不足', 403);
    }

    if (req.user.role === 'adapter' && order.adapter_id !== req.user.id) {
      return errorResponse(res, '权限不足', 403);
    }

    const items = await query('SELECT * FROM order_items WHERE order_id = ? ORDER BY id ASC', [id]);
    order.items = items;

    successResponse(res, order, '获取订单详情成功');
  } catch (error) {
    console.error('获取订单详情错误:', error);
    errorResponse(res, '获取订单详情失败', 500);
  }
}

async function updateOrderStatus(req, res) {
  const connection = await getConnection();
  try {
    await connection.beginTransaction();

    const { id } = req.params;
    const { order_status, remark } = req.body;

    const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'completed', 'cancelled', 'refunded'];
    if (!validStatuses.includes(order_status)) {
      await connection.rollback();
      return errorResponse(res, '无效的状态值');
    }

    const [ordersResult] = await connection.query('SELECT * FROM orders WHERE id = ?', [id]);
    if (ordersResult.length === 0) {
      await connection.rollback();
      return errorResponse(res, '订单不存在', 404);
    }

    const order = ordersResult[0];

    if (req.user.role === 'disabled' && order.user_id !== req.user.id) {
      await connection.rollback();
      return errorResponse(res, '权限不足', 403);
    }

    if (req.user.role === 'adapter' && order.adapter_id !== req.user.id) {
      await connection.rollback();
      return errorResponse(res, '权限不足', 403);
    }

    let updateSql = 'UPDATE orders SET order_status = ?';
    const updateParams = [order_status];

    if (order_status === 'confirmed') {
      updateSql += ', confirmed_at = NOW()';
    } else if (order_status === 'delivered') {
      updateSql += ', delivered_at = NOW()';
    } else if (order_status === 'completed') {
      updateSql += ', completed_at = NOW()';
    }

    if (remark !== undefined) {
      updateSql += ', remark = ?';
      updateParams.push(remark);
    }

    updateSql += ' WHERE id = ?';
    updateParams.push(id);

    await connection.query(updateSql, updateParams);

    const statusMap = {
      pending: '待确认',
      confirmed: '已确认',
      processing: '处理中',
      shipped: '已发货',
      delivered: '已送达',
      completed: '已完成',
      cancelled: '已取消',
      refunded: '已退款'
    };

    const notificationTitle = '订单状态更新';
    const notificationContent = `订单 ${order.order_no} 状态已更新为：${statusMap[order_status]}`;

    const notifyUserId = req.user.id === order.user_id ? order.adapter_id : order.user_id;
    await createNotification(notifyUserId, 'order', notificationTitle, notificationContent, 'order', id);

    await connection.commit();

    const [updatedOrders] = await connection.query('SELECT * FROM orders WHERE id = ?', [id]);
    successResponse(res, updatedOrders[0], '订单状态更新成功');
  } catch (error) {
    await connection.rollback();
    console.error('更新订单状态错误:', error);
    errorResponse(res, '更新订单状态失败', 500);
  } finally {
    connection.release();
  }
}

async function payOrder(req, res) {
  const connection = await getConnection();
  try {
    await connection.beginTransaction();

    const { id } = req.params;

    const [ordersResult] = await connection.query('SELECT * FROM orders WHERE id = ?', [id]);
    if (ordersResult.length === 0) {
      await connection.rollback();
      return errorResponse(res, '订单不存在', 404);
    }

    const order = ordersResult[0];

    if (req.user.role === 'disabled' && order.user_id !== req.user.id) {
      await connection.rollback();
      return errorResponse(res, '权限不足', 403);
    }

    if (order.payment_status !== 'unpaid') {
      await connection.rollback();
      return errorResponse(res, '订单已支付或已退款');
    }

    await connection.query(
      'UPDATE orders SET payment_status = ? WHERE id = ?',
      ['paid', id]
    );

    await createNotification(
      order.adapter_id,
      'order',
      '订单已支付',
      `订单 ${order.order_no} 已支付完成`,
      'order',
      id
    );

    await connection.commit();

    const [updatedOrders] = await connection.query('SELECT * FROM orders WHERE id = ?', [id]);
    successResponse(res, updatedOrders[0], '支付成功');
  } catch (error) {
    await connection.rollback();
    console.error('支付订单错误:', error);
    errorResponse(res, '支付失败', 500);
  } finally {
    connection.release();
  }
}

async function getOrderItems(req, res) {
  try {
    const { id } = req.params;

    const orders = await query('SELECT * FROM orders WHERE id = ?', [id]);
    if (orders.length === 0) {
      return errorResponse(res, '订单不存在', 404);
    }

    const order = orders[0];

    if (req.user.role === 'disabled' && order.user_id !== req.user.id) {
      return errorResponse(res, '权限不足', 403);
    }

    if (req.user.role === 'adapter' && order.adapter_id !== req.user.id) {
      return errorResponse(res, '权限不足', 403);
    }

    const items = await query('SELECT * FROM order_items WHERE order_id = ? ORDER BY id ASC', [id]);

    successResponse(res, items, '获取订单明细成功');
  } catch (error) {
    console.error('获取订单明细错误:', error);
    errorResponse(res, '获取订单明细失败', 500);
  }
}

async function getOrderStatistics(req, res) {
  try {
    let sql = 'SELECT COUNT(*) as total_count, COALESCE(SUM(actual_amount), 0) as total_amount FROM orders WHERE 1=1';
    const params = [];

    if (req.user.role === 'disabled') {
      sql += ' AND user_id = ?';
      params.push(req.user.id);
    } else if (req.user.role === 'adapter') {
      sql += ' AND adapter_id = ?';
      params.push(req.user.id);
    }

    const totalResult = await query(sql, params);
    const total = totalResult[0];

    const statuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'completed', 'cancelled', 'refunded'];
    const statusStats = {};

    for (const status of statuses) {
      let statusSql = 'SELECT COUNT(*) as count, COALESCE(SUM(actual_amount), 0) as amount FROM orders WHERE order_status = ?';
      const statusParams = [status];

      if (req.user.role === 'disabled') {
        statusSql += ' AND user_id = ?';
        statusParams.push(req.user.id);
      } else if (req.user.role === 'adapter') {
        statusSql += ' AND adapter_id = ?';
        statusParams.push(req.user.id);
      }

      const result = await query(statusSql, statusParams);
      statusStats[status] = {
        count: result[0].count,
        amount: result[0].amount
      };
    }

    let paidSql = 'SELECT COUNT(*) as paid_count, COALESCE(SUM(actual_amount), 0) as paid_amount FROM orders WHERE payment_status = ?';
    const paidParams = ['paid'];

    if (req.user.role === 'disabled') {
      paidSql += ' AND user_id = ?';
      paidParams.push(req.user.id);
    } else if (req.user.role === 'adapter') {
      paidSql += ' AND adapter_id = ?';
      paidParams.push(req.user.id);
    }

    const paidResult = await query(paidSql, paidParams);

    successResponse(res, {
      total_count: total.total_count,
      total_amount: total.total_amount,
      paid_count: paidResult[0].paid_count,
      paid_amount: paidResult[0].paid_amount,
      status_stats: statusStats
    }, '获取订单统计成功');
  } catch (error) {
    console.error('获取订单统计错误:', error);
    errorResponse(res, '获取订单统计失败', 500);
  }
}

module.exports = {
  getOrders,
  getOrderDetail,
  updateOrderStatus,
  payOrder,
  getOrderItems,
  getOrderStatistics
};
