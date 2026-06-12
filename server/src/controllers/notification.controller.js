const { query, getConnection } = require('../config/database');
const { successResponse, errorResponse, paginate } = require('../utils/helpers');
const { getUnreadCount } = require('../services/notification.service');

async function getMyNotifications(req, res) {
  try {
    const { page = 1, pageSize = 10, is_read, type } = req.query;
    const { limit, offset } = paginate(page, pageSize);

    let sql = 'SELECT * FROM notifications WHERE user_id = ?';
    const params = [req.user.id];

    if (is_read !== undefined && is_read !== '') {
      sql += ' AND is_read = ?';
      params.push(is_read === 'true' || is_read === '1' ? 1 : 0);
    }

    if (type) {
      sql += ' AND type = ?';
      params.push(type);
    }

    const countSql = sql.replace('SELECT *', 'SELECT COUNT(*) as total');
    const countResult = await query(countSql, params);
    const total = countResult[0].total;

    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const notifications = await query(sql, params);

    successResponse(res, {
      list: notifications,
      total,
      page: parseInt(page),
      pageSize: parseInt(pageSize)
    }, '获取通知列表成功');
  } catch (error) {
    console.error('获取通知列表错误:', error);
    errorResponse(res, '获取通知列表失败', 500);
  }
}

async function getUnreadNotificationCount(req, res) {
  try {
    const count = await getUnreadCount(req.user.id);

    successResponse(res, { unread_count: count }, '获取未读数量成功');
  } catch (error) {
    console.error('获取未读数量错误:', error);
    errorResponse(res, '获取未读数量失败', 500);
  }
}

async function markAsRead(req, res) {
  try {
    const { id } = req.params;

    const notifications = await query('SELECT * FROM notifications WHERE id = ? AND user_id = ?', [id, req.user.id]);

    if (notifications.length === 0) {
      return errorResponse(res, '通知不存在', 404);
    }

    await query('UPDATE notifications SET is_read = 1, read_at = NOW() WHERE id = ?', [id]);

    const [updated] = await query('SELECT * FROM notifications WHERE id = ?', [id]);
    successResponse(res, updated, '标记已读成功');
  } catch (error) {
    console.error('标记已读错误:', error);
    errorResponse(res, '标记已读失败', 500);
  }
}

async function markAllAsRead(req, res) {
  try {
    const result = await query(
      'UPDATE notifications SET is_read = 1, read_at = NOW() WHERE user_id = ? AND is_read = 0',
      [req.user.id]
    );

    successResponse(res, { updated_count: result.affectedRows }, '全部标记已读成功');
  } catch (error) {
    console.error('全部标记已读错误:', error);
    errorResponse(res, '全部标记已读失败', 500);
  }
}

async function deleteNotification(req, res) {
  try {
    const { id } = req.params;

    const notifications = await query('SELECT * FROM notifications WHERE id = ? AND user_id = ?', [id, req.user.id]);

    if (notifications.length === 0) {
      return errorResponse(res, '通知不存在', 404);
    }

    await query('DELETE FROM notifications WHERE id = ?', [id]);

    successResponse(res, null, '删除通知成功');
  } catch (error) {
    console.error('删除通知错误:', error);
    errorResponse(res, '删除通知失败', 500);
  }
}

module.exports = {
  getMyNotifications,
  getUnreadNotificationCount,
  markAsRead,
  markAllAsRead,
  deleteNotification
};
