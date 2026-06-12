const jwt = require('jsonwebtoken');
const { query } = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'rehab_platform_jwt_secret_key_2024';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

async function authMiddleware(req, res, next) {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ code: 401, message: '请先登录' });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ code: 401, message: '登录已过期，请重新登录' });
    }

    const users = await query('SELECT id, username, real_name, role, status, phone, email FROM users WHERE id = ?', [decoded.id]);
    if (users.length === 0) {
      return res.status(401).json({ code: 401, message: '用户不存在' });
    }

    const user = users[0];
    if (user.status !== 1) {
      return res.status(403).json({ code: 403, message: '账号已被禁用' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('认证中间件错误:', error);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
}

function roleMiddleware(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ code: 401, message: '请先登录' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ code: 403, message: '权限不足' });
    }

    next();
  };
}

module.exports = {
  generateToken,
  verifyToken,
  authMiddleware,
  roleMiddleware
};
