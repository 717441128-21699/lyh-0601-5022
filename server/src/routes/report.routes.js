const express = require('express');
const router = express.Router();
const { authMiddleware, roleMiddleware } = require('../middlewares/auth.middleware');
const {
  getMonthlyReports,
  getMonthlyReportDetail,
  generateMonthlyReport,
  getDashboardData
} = require('../controllers/report.controller');

router.get('/dashboard', authMiddleware, roleMiddleware('admin'), getDashboardData);
router.get('/monthly', authMiddleware, roleMiddleware('admin'), getMonthlyReports);
router.get('/monthly/:month', authMiddleware, roleMiddleware('admin'), getMonthlyReportDetail);
router.post('/monthly/generate', authMiddleware, roleMiddleware('admin'), generateMonthlyReport);

module.exports = router;
