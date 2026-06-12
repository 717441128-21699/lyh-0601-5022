const express = require('express');
const router = express.Router();
const { authMiddleware, roleMiddleware } = require('../middlewares/auth.middleware');
const assessmentController = require('../controllers/assessment.controller');

router.post('/', authMiddleware, roleMiddleware('disabled'), assessmentController.createAssessment);
router.get('/', authMiddleware, assessmentController.getAssessments);
router.get('/:id', authMiddleware, assessmentController.getAssessmentById);
router.put('/:id', authMiddleware, assessmentController.updateAssessment);
router.post('/:id/home-assessment', authMiddleware, roleMiddleware('adapter', 'admin'), assessmentController.addHomeAssessment);
router.get('/:id/recommendation', authMiddleware, assessmentController.getRecommendation);

module.exports = router;
