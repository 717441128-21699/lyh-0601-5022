const { query } = require('../config/database');

async function createNotification(userId, type, title, content, relatedType = null, relatedId = null) {
  const result = await query(
    'INSERT INTO notifications (user_id, type, title, content, related_type, related_id, push_status) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [userId, type, title, content, relatedType, relatedId, 'success']
  );
  return result.insertId;
}

async function batchCreateNotifications(userIds, type, title, content, relatedType = null, relatedId = null) {
  if (!userIds || userIds.length === 0) return [];
  
  const values = userIds.map(userId => 
    [userId, type, title, content, relatedType, relatedId, 'success']
  );
  
  const placeholders = userIds.map(() => '(?, ?, ?, ?, ?, ?, ?)').join(', ');
  const params = values.flat();
  
  const result = await query(
    `INSERT INTO notifications (user_id, type, title, content, related_type, related_id, push_status) VALUES ${placeholders}`,
    params
  );
  
  return result;
}

async function getUnreadCount(userId) {
  const rows = await query(
    'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0',
    [userId]
  );
  return rows[0].count;
}

module.exports = {
  createNotification,
  batchCreateNotifications,
  getUnreadCount
};
