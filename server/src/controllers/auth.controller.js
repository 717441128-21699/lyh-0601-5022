const bcrypt = require('bcryptjs');
const { query, getConnection } = require('../config/database');
const { generateToken } = require('../middlewares/auth.middleware');
const { successResponse, errorResponse } = require('../utils/helpers');
const { createNotification } = require('../services/notification.service');

async function login(req, res) {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return errorResponse(res, '用户名和密码不能为空', 400);
    }

    const users = await query('SELECT * FROM users WHERE username = ?', [username]);
    if (users.length === 0) {
      return errorResponse(res, '用户名或密码错误', 401);
    }

    const user = users[0];
    if (user.status !== 1) {
      return errorResponse(res, '账号已被禁用', 403);
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return errorResponse(res, '用户名或密码错误', 401);
    }

    const token = generateToken({ id: user.id, username: user.username, role: user.role });

    const userInfo = {
      id: user.id,
      username: user.username,
      realName: user.real_name,
      phone: user.phone,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
      status: user.status
    };

    successResponse(res, { token, user: userInfo }, '登录成功');
  } catch (error) {
    console.error('登录错误:', error);
    errorResponse(res, '登录失败', 500);
  }
}

async function register(req, res) {
  const connection = await getConnection();
  try {
    await connection.beginTransaction();

    const { username, password, realName, phone, email, disabilityType, disabilityLevel, height, weight, age, gender, address, latitude, longitude } = req.body;

    if (!username || !password || !realName || !phone || !disabilityType) {
      await connection.rollback();
      return errorResponse(res, '请填写必填项', 400);
    }

    const existingUsers = await connection.query('SELECT id FROM users WHERE username = ?', [username]);
    if (existingUsers[0].length > 0) {
      await connection.rollback();
      return errorResponse(res, '用户名已存在', 400);
    }

    const existingPhones = await connection.query('SELECT id FROM users WHERE phone = ?', [phone]);
    if (existingPhones[0].length > 0) {
      await connection.rollback();
      return errorResponse(res, '手机号已被注册', 400);
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [userResult] = await connection.query(
      'INSERT INTO users (username, password, real_name, phone, email, role, address, latitude, longitude, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [username, hashedPassword, realName, phone, email || null, 'disabled', address || null, latitude || null, longitude || null, 1]
    );

    const userId = userResult.insertId;

    await connection.query(
      'INSERT INTO disabled_profiles (user_id, disability_type, disability_level, height, weight, age, gender) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [userId, disabilityType, disabilityLevel || null, height || null, weight || null, age || null, gender || null]
    );

    await connection.commit();

    const token = generateToken({ id: userId, username, role: 'disabled' });

    await createNotification(userId, 'system', '注册成功', '欢迎使用康复平台，请完善您的个人信息');

    const userInfo = {
      id: userId,
      username,
      realName,
      phone,
      email: email || null,
      role: 'disabled',
      avatar: null,
      status: 1
    };

    successResponse(res, { token, user: userInfo }, '注册成功');
  } catch (error) {
    await connection.rollback();
    console.error('注册错误:', error);
    errorResponse(res, '注册失败', 500);
  } finally {
    connection.release();
  }
}

async function logout(req, res) {
  try {
    successResponse(res, null, '登出成功');
  } catch (error) {
    console.error('登出错误:', error);
    errorResponse(res, '登出失败', 500);
  }
}

async function getProfile(req, res) {
  try {
    const userId = req.user.id;

    const users = await query('SELECT id, username, real_name, phone, email, role, avatar, status, address, latitude, longitude, created_at, updated_at FROM users WHERE id = ?', [userId]);
    if (users.length === 0) {
      return errorResponse(res, '用户不存在', 404);
    }

    const user = users[0];
    let profile = null;

    if (user.role === 'disabled') {
      const profiles = await query('SELECT * FROM disabled_profiles WHERE user_id = ?', [userId]);
      profile = profiles[0] || null;
    } else if (user.role === 'adapter') {
      const profiles = await query('SELECT * FROM adapter_profiles WHERE user_id = ?', [userId]);
      profile = profiles[0] || null;
    } else if (user.role === 'therapist') {
      const profiles = await query('SELECT * FROM therapist_profiles WHERE user_id = ?', [userId]);
      profile = profiles[0] || null;
    }

    const userInfo = {
      id: user.id,
      username: user.username,
      realName: user.real_name,
      phone: user.phone,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
      status: user.status,
      address: user.address,
      latitude: user.latitude,
      longitude: user.longitude,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
      profile
    };

    successResponse(res, userInfo, '获取成功');
  } catch (error) {
    console.error('获取用户信息错误:', error);
    errorResponse(res, '获取用户信息失败', 500);
  }
}

module.exports = {
  login,
  register,
  logout,
  getProfile
};
