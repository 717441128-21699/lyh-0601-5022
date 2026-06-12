const express = require('express');
const router = express.Router();
const { authMiddleware, roleMiddleware } = require('../middlewares/auth.middleware');
const {
  getFinanceRecords,
  getFinanceRecordDetail,
  addFinanceRecord,
  getFinanceSummary,
  getFinanceStatistics
} = require('../controllers/finance.controller');

router.get('/records', authMiddleware, roleMiddleware('finance', 'admin'), getFinanceRecords);
router.get('/records/:id', authMiddleware, roleMiddleware('finance', 'admin'), getFinanceRecordDetail);
router.post('/records', authMiddleware, roleMiddleware('finance', 'admin'), addFinanceRecord);
router.get('/summary', authMiddleware, roleMiddleware('finance', 'admin'), getFinanceSummary);
router.get('/statistics', authMiddleware, roleMiddleware('finance', 'admin'), getFinanceStatistics);

module.exports = router;
