const express = require('express');
const router = express.Router();
const { authMiddleware, roleMiddleware } = require('../middlewares/auth.middleware');
const deviceController = require('../controllers/device.controller');

router.get('/', deviceController.getDevices);
router.get('/categories/list', deviceController.getDeviceCategories);
router.get('/:id', deviceController.getDeviceById);

router.post('/', authMiddleware, roleMiddleware('admin'), deviceController.createDevice);
router.put('/:id', authMiddleware, roleMiddleware('admin'), deviceController.updateDevice);
router.delete('/:id', authMiddleware, roleMiddleware('admin'), deviceController.deleteDevice);

module.exports = router;
