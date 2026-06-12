const express = require('express');
const { getUsers, getUserById, updateUser, updateProfile, getAdapters, getTherapists, createUser } = require('../controllers/user.controller');
const { authMiddleware, roleMiddleware } = require('../middlewares/auth.middleware');

const router = express.Router();

router.use(authMiddleware);

router.get('/adapters', getAdapters);
router.get('/therapists', getTherapists);
router.put('/profile', updateProfile);

router.get('/', roleMiddleware('admin'), getUsers);
router.post('/', roleMiddleware('admin'), createUser);
router.get('/:id', getUserById);
router.put('/:id', roleMiddleware('admin'), updateUser);

module.exports = router;
