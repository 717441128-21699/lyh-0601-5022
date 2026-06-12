const express = require('express');
const router = express.Router();
const { authMiddleware, roleMiddleware } = require('../middlewares/auth.middleware');
const {
  createPlan,
  getPlans,
  getPlanDetail,
  updatePlan,
  updatePlanStatus,
  generateOrder
} = require('../controllers/plan.controller');

router.post('/', authMiddleware, roleMiddleware('adapter', 'admin'), createPlan);
router.get('/', authMiddleware, getPlans);
router.get('/:id', authMiddleware, getPlanDetail);
router.put('/:id', authMiddleware, roleMiddleware('adapter', 'admin'), updatePlan);
router.put('/:id/status', authMiddleware, roleMiddleware('disabled', 'admin'), updatePlanStatus);
router.post('/:id/generate-order', authMiddleware, roleMiddleware('disabled', 'admin'), generateOrder);

module.exports = router;
