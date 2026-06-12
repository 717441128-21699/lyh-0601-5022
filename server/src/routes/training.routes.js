const express = require('express');
const router = express.Router();
const { authMiddleware, roleMiddleware } = require('../middlewares/auth.middleware');
const {
  createTrainingPlan,
  getTrainingPlans,
  getTrainingPlanDetail,
  updateTrainingPlan,
  updateTrainingPlanStatus,
  createTrainingRecord,
  getTrainingRecords,
  getTrainingRecordDetail,
  getPlanRecords,
  getPlanProgress
} = require('../controllers/training.controller');

router.post('/plans', authMiddleware, roleMiddleware('therapist', 'admin'), createTrainingPlan);
router.get('/plans', authMiddleware, getTrainingPlans);
router.get('/plans/:id', authMiddleware, getTrainingPlanDetail);
router.put('/plans/:id', authMiddleware, roleMiddleware('therapist', 'admin'), updateTrainingPlan);
router.put('/plans/:id/status', authMiddleware, roleMiddleware('therapist', 'admin'), updateTrainingPlanStatus);

router.post('/records', authMiddleware, roleMiddleware('therapist', 'admin'), createTrainingRecord);
router.get('/records', authMiddleware, getTrainingRecords);
router.get('/records/:id', authMiddleware, getTrainingRecordDetail);
router.get('/plans/:id/records', authMiddleware, getPlanRecords);
router.get('/plans/:id/progress', authMiddleware, getPlanProgress);

module.exports = router;
