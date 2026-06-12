const express = require('express');
const router = express.Router();
const { authMiddleware, roleMiddleware } = require('../middlewares/auth.middleware');
const {
  getOrders,
  getOrderDetail,
  updateOrderStatus,
  payOrder,
  getOrderItems,
  getOrderStatistics
} = require('../controllers/order.controller');

router.get('/statistics/summary', authMiddleware, getOrderStatistics);
router.get('/', authMiddleware, getOrders);
router.get('/:id', authMiddleware, getOrderDetail);
router.put('/:id/status', authMiddleware, roleMiddleware('adapter', 'admin'), updateOrderStatus);
router.put('/:id/pay', authMiddleware, roleMiddleware('disabled', 'admin'), payOrder);
router.get('/:id/items', authMiddleware, getOrderItems);

module.exports = router;
