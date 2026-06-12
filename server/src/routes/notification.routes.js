const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middlewares/auth.middleware');
const {
  getMyNotifications,
  getUnreadNotificationCount,
  markAsRead,
  markAllAsRead,
  deleteNotification
} = require('../controllers/notification.controller');

router.get('/', authMiddleware, getMyNotifications);
router.get('/unread-count', authMiddleware, getUnreadNotificationCount);
router.put('/:id/read', authMiddleware, markAsRead);
router.put('/read-all', authMiddleware, markAllAsRead);
router.delete('/:id', authMiddleware, deleteNotification);

module.exports = router;
