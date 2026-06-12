const express = require('express');
const router = express.Router();
const { authMiddleware, roleMiddleware } = require('../middlewares/auth.middleware');
const {
  getAvailableAppointments,
  createAppointment,
  getAppointments,
  getAppointmentDetail,
  updateAppointmentStatus,
  rescheduleAppointment,
  getTherapistSlots
} = require('../controllers/appointment.controller');

router.get('/available', authMiddleware, getAvailableAppointments);
router.post('/', authMiddleware, createAppointment);
router.get('/', authMiddleware, getAppointments);
router.get('/:id', authMiddleware, getAppointmentDetail);
router.put('/:id/status', authMiddleware, updateAppointmentStatus);
router.put('/:id/reschedule', authMiddleware, rescheduleAppointment);
router.get('/therapist/:therapistId/slots', authMiddleware, getTherapistSlots);

module.exports = router;
