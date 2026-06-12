const bcrypt = require('bcryptjs');
const { query, getConnection } = require('../config/database');
const { successResponse, errorResponse, paginate, parseJsonField } = require('../utils/helpers');
const { createNotification } = require('../services/notification.service');

async function getUsers(req, res) {
  try {
    const { page = 1, pageSize = 10, role, keyword, status } = req.query;
    const { limit, offset } = paginate(page, pageSize);

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (role) {
      whereClause += ' AND role = ?';
      params.push(role);
    }

    if (keyword) {
      whereClause += ' AND (username LIKE ? OR real_name LIKE ? OR phone LIKE ?)';
      const searchKeyword = `%${keyword}%`;
      params.push(searchKeyword, searchKeyword, searchKeyword);
    }

    if (status !== undefined && status !== '') {
      whereClause += ' AND status = ?';
      params.push(parseInt(status));
    }

    const countResult = await query(`SELECT COUNT(*) as total FROM users ${whereClause}`, params);
    const total = countResult[0].total;

    const users = await query(
      `SELECT id, username, real_name, phone, email, role, avatar, status, address, created_at FROM users ${whereClause} ORDER BY id DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const userList = users.map(user => ({
      id: user.id,
      username: user.username,
      realName: user.real_name,
      phone: user.phone,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
      status: user.status,
      address: user.address,
      createdAt: user.created_at
    }));

    successResponse(res, {
      list: userList,
      total,
      page: parseInt(page),
      pageSize: parseInt(pageSize)
    }, '获取成功');
  } catch (error) {
    console.error('获取用户列表错误:', error);
    errorResponse(res, '获取用户列表失败', 500);
  }
}

async function getUserById(req, res) {
  try {
    const { id } = req.params;

    const users = await query('SELECT id, username, real_name, phone, email, role, avatar, status, address, latitude, longitude, created_at, updated_at FROM users WHERE id = ?', [id]);
    if (users.length === 0) {
      return errorResponse(res, '用户不存在', 404);
    }

    const user = users[0];
    let profile = null;

    if (user.role === 'disabled') {
      const profiles = await query('SELECT * FROM disabled_profiles WHERE user_id = ?', [id]);
      profile = profiles[0] || null;
    } else if (user.role === 'adapter') {
      const profiles = await query('SELECT * FROM adapter_profiles WHERE user_id = ?', [id]);
      profile = profiles[0] || null;
    } else if (user.role === 'therapist') {
      const profiles = await query('SELECT * FROM therapist_profiles WHERE user_id = ?', [id]);
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
    console.error('获取用户详情错误:', error);
    errorResponse(res, '获取用户详情失败', 500);
  }
}

async function updateUser(req, res) {
  const connection = await getConnection();
  try {
    await connection.beginTransaction();

    const { id } = req.params;
    const { realName, phone, email, role, status, address, avatar, latitude, longitude, profile } = req.body;

    const existingUsers = await connection.query('SELECT id, role FROM users WHERE id = ?', [id]);
    if (existingUsers[0].length === 0) {
      await connection.rollback();
      return errorResponse(res, '用户不存在', 404);
    }

    const existingUser = existingUsers[0][0];

    if (phone) {
      const phoneUsers = await connection.query('SELECT id FROM users WHERE phone = ? AND id != ?', [phone, id]);
      if (phoneUsers[0].length > 0) {
        await connection.rollback();
        return errorResponse(res, '手机号已被使用', 400);
      }
    }

    const updateFields = [];
    const updateParams = [];

    if (realName !== undefined) {
      updateFields.push('real_name = ?');
      updateParams.push(realName);
    }
    if (phone !== undefined) {
      updateFields.push('phone = ?');
      updateParams.push(phone);
    }
    if (email !== undefined) {
      updateFields.push('email = ?');
      updateParams.push(email);
    }
    if (role !== undefined) {
      updateFields.push('role = ?');
      updateParams.push(role);
    }
    if (status !== undefined) {
      updateFields.push('status = ?');
      updateParams.push(status);
    }
    if (address !== undefined) {
      updateFields.push('address = ?');
      updateParams.push(address);
    }
    if (avatar !== undefined) {
      updateFields.push('avatar = ?');
      updateParams.push(avatar);
    }
    if (latitude !== undefined) {
      updateFields.push('latitude = ?');
      updateParams.push(latitude);
    }
    if (longitude !== undefined) {
      updateFields.push('longitude = ?');
      updateParams.push(longitude);
    }

    if (updateFields.length > 0) {
      await connection.query(`UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`, [...updateParams, id]);
    }

    if (profile) {
      const targetRole = role || existingUser.role;
      
      if (targetRole === 'disabled') {
        const profileFields = [];
        const profileParams = [];

        if (profile.disabilityType !== undefined) {
          profileFields.push('disability_type = ?');
          profileParams.push(profile.disabilityType);
        }
        if (profile.disabilityLevel !== undefined) {
          profileFields.push('disability_level = ?');
          profileParams.push(profile.disabilityLevel);
        }
        if (profile.height !== undefined) {
          profileFields.push('height = ?');
          profileParams.push(profile.height);
        }
        if (profile.weight !== undefined) {
          profileFields.push('weight = ?');
          profileParams.push(profile.weight);
        }
        if (profile.age !== undefined) {
          profileFields.push('age = ?');
          profileParams.push(profile.age);
        }
        if (profile.gender !== undefined) {
          profileFields.push('gender = ?');
          profileParams.push(profile.gender);
        }
        if (profile.medicalHistory !== undefined) {
          profileFields.push('medical_history = ?');
          profileParams.push(profile.medicalHistory);
        }
        if (profile.dailyNeeds !== undefined) {
          profileFields.push('daily_needs = ?');
          profileParams.push(profile.dailyNeeds);
        }
        if (profile.livingEnvironment !== undefined) {
          profileFields.push('living_environment = ?');
          profileParams.push(profile.livingEnvironment);
        }

        if (profileFields.length > 0) {
          const existingProfile = await connection.query('SELECT id FROM disabled_profiles WHERE user_id = ?', [id]);
          if (existingProfile[0].length > 0) {
            await connection.query(`UPDATE disabled_profiles SET ${profileFields.join(', ')} WHERE user_id = ?`, [...profileParams, id]);
          } else {
            await connection.query(
              `INSERT INTO disabled_profiles (user_id, ${profileFields.map(f => f.split(' ')[0]).join(', ')}) VALUES (?, ${profileFields.map(() => '?').join(', ')})`,
              [id, ...profileParams]
            );
          }
        }
      } else if (targetRole === 'adapter') {
        const profileFields = [];
        const profileParams = [];

        if (profile.licenseNo !== undefined) {
          profileFields.push('license_no = ?');
          profileParams.push(profile.licenseNo);
        }
        if (profile.specialty !== undefined) {
          profileFields.push('specialty = ?');
          profileParams.push(profile.specialty);
        }
        if (profile.experienceYears !== undefined) {
          profileFields.push('experience_years = ?');
          profileParams.push(profile.experienceYears);
        }
        if (profile.workArea !== undefined) {
          profileFields.push('work_area = ?');
          profileParams.push(profile.workArea);
        }

        if (profileFields.length > 0) {
          const existingProfile = await connection.query('SELECT id FROM adapter_profiles WHERE user_id = ?', [id]);
          if (existingProfile[0].length > 0) {
            await connection.query(`UPDATE adapter_profiles SET ${profileFields.join(', ')} WHERE user_id = ?`, [...profileParams, id]);
          } else {
            await connection.query(
              `INSERT INTO adapter_profiles (user_id, ${profileFields.map(f => f.split(' ')[0]).join(', ')}) VALUES (?, ${profileFields.map(() => '?').join(', ')})`,
              [id, ...profileParams]
            );
          }
        }
      } else if (targetRole === 'therapist') {
        const profileFields = [];
        const profileParams = [];

        if (profile.licenseNo !== undefined) {
          profileFields.push('license_no = ?');
          profileParams.push(profile.licenseNo);
        }
        if (profile.specialty !== undefined) {
          profileFields.push('specialty = ?');
          profileParams.push(profile.specialty);
        }
        if (profile.experienceYears !== undefined) {
          profileFields.push('experience_years = ?');
          profileParams.push(profile.experienceYears);
        }
        if (profile.workAddress !== undefined) {
          profileFields.push('work_address = ?');
          profileParams.push(profile.workAddress);
        }
        if (profile.latitude !== undefined) {
          profileFields.push('latitude = ?');
          profileParams.push(profile.latitude);
        }
        if (profile.longitude !== undefined) {
          profileFields.push('longitude = ?');
          profileParams.push(profile.longitude);
        }
        if (profile.workDays !== undefined) {
          profileFields.push('work_days = ?');
          profileParams.push(profile.workDays);
        }
        if (profile.workStartTime !== undefined) {
          profileFields.push('work_start_time = ?');
          profileParams.push(profile.workStartTime);
        }
        if (profile.workEndTime !== undefined) {
          profileFields.push('work_end_time = ?');
          profileParams.push(profile.workEndTime);
        }

        if (profileFields.length > 0) {
          const existingProfile = await connection.query('SELECT id FROM therapist_profiles WHERE user_id = ?', [id]);
          if (existingProfile[0].length > 0) {
            await connection.query(`UPDATE therapist_profiles SET ${profileFields.join(', ')} WHERE user_id = ?`, [...profileParams, id]);
          } else {
            await connection.query(
              `INSERT INTO therapist_profiles (user_id, ${profileFields.map(f => f.split(' ')[0]).join(', ')}) VALUES (?, ${profileFields.map(() => '?').join(', ')})`,
              [id, ...profileParams]
            );
          }
        }
      }
    }

    await connection.commit();

    successResponse(res, null, '更新成功');
  } catch (error) {
    await connection.rollback();
    console.error('更新用户错误:', error);
    errorResponse(res, '更新用户失败', 500);
  } finally {
    connection.release();
  }
}

async function updateProfile(req, res) {
  const connection = await getConnection();
  try {
    await connection.beginTransaction();

    const userId = req.user.id;
    const { realName, phone, email, address, avatar, latitude, longitude, profile } = req.body;

    if (phone) {
      const phoneUsers = await connection.query('SELECT id FROM users WHERE phone = ? AND id != ?', [phone, userId]);
      if (phoneUsers[0].length > 0) {
        await connection.rollback();
        return errorResponse(res, '手机号已被使用', 400);
      }
    }

    const updateFields = [];
    const updateParams = [];

    if (realName !== undefined) {
      updateFields.push('real_name = ?');
      updateParams.push(realName);
    }
    if (phone !== undefined) {
      updateFields.push('phone = ?');
      updateParams.push(phone);
    }
    if (email !== undefined) {
      updateFields.push('email = ?');
      updateParams.push(email);
    }
    if (address !== undefined) {
      updateFields.push('address = ?');
      updateParams.push(address);
    }
    if (avatar !== undefined) {
      updateFields.push('avatar = ?');
      updateParams.push(avatar);
    }
    if (latitude !== undefined) {
      updateFields.push('latitude = ?');
      updateParams.push(latitude);
    }
    if (longitude !== undefined) {
      updateFields.push('longitude = ?');
      updateParams.push(longitude);
    }

    if (updateFields.length > 0) {
      await connection.query(`UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`, [...updateParams, userId]);
    }

    if (profile && req.user.role === 'disabled') {
      const profileFields = [];
      const profileParams = [];

      if (profile.disabilityType !== undefined) {
        profileFields.push('disability_type = ?');
        profileParams.push(profile.disabilityType);
      }
      if (profile.disabilityLevel !== undefined) {
        profileFields.push('disability_level = ?');
        profileParams.push(profile.disabilityLevel);
      }
      if (profile.height !== undefined) {
        profileFields.push('height = ?');
        profileParams.push(profile.height);
      }
      if (profile.weight !== undefined) {
        profileFields.push('weight = ?');
        profileParams.push(profile.weight);
      }
      if (profile.age !== undefined) {
        profileFields.push('age = ?');
        profileParams.push(profile.age);
      }
      if (profile.gender !== undefined) {
        profileFields.push('gender = ?');
        profileParams.push(profile.gender);
      }
      if (profile.medicalHistory !== undefined) {
        profileFields.push('medical_history = ?');
        profileParams.push(profile.medicalHistory);
      }
      if (profile.dailyNeeds !== undefined) {
        profileFields.push('daily_needs = ?');
        profileParams.push(profile.dailyNeeds);
      }
      if (profile.livingEnvironment !== undefined) {
        profileFields.push('living_environment = ?');
        profileParams.push(profile.livingEnvironment);
      }

      if (profileFields.length > 0) {
        const existingProfile = await connection.query('SELECT id FROM disabled_profiles WHERE user_id = ?', [userId]);
        if (existingProfile[0].length > 0) {
          await connection.query(`UPDATE disabled_profiles SET ${profileFields.join(', ')} WHERE user_id = ?`, [...profileParams, userId]);
        } else {
          await connection.query(
            `INSERT INTO disabled_profiles (user_id, ${profileFields.map(f => f.split(' ')[0]).join(', ')}) VALUES (?, ${profileFields.map(() => '?').join(', ')})`,
            [userId, ...profileParams]
          );
        }
      }
    }

    if (profile && req.user.role === 'adapter') {
      const profileFields = [];
      const profileParams = [];

      if (profile.licenseNo !== undefined) {
        profileFields.push('license_no = ?');
        profileParams.push(profile.licenseNo);
      }
      if (profile.specialty !== undefined) {
        profileFields.push('specialty = ?');
        profileParams.push(profile.specialty);
      }
      if (profile.experienceYears !== undefined) {
        profileFields.push('experience_years = ?');
        profileParams.push(profile.experienceYears);
      }
      if (profile.workArea !== undefined) {
        profileFields.push('work_area = ?');
        profileParams.push(profile.workArea);
      }

      if (profileFields.length > 0) {
        const existingProfile = await connection.query('SELECT id FROM adapter_profiles WHERE user_id = ?', [userId]);
        if (existingProfile[0].length > 0) {
          await connection.query(`UPDATE adapter_profiles SET ${profileFields.join(', ')} WHERE user_id = ?`, [...profileParams, userId]);
        } else {
          await connection.query(
            `INSERT INTO adapter_profiles (user_id, ${profileFields.map(f => f.split(' ')[0]).join(', ')}) VALUES (?, ${profileFields.map(() => '?').join(', ')})`,
            [userId, ...profileParams]
          );
        }
      }
    }

    if (profile && req.user.role === 'therapist') {
      const profileFields = [];
      const profileParams = [];

      if (profile.licenseNo !== undefined) {
        profileFields.push('license_no = ?');
        profileParams.push(profile.licenseNo);
      }
      if (profile.specialty !== undefined) {
        profileFields.push('specialty = ?');
        profileParams.push(profile.specialty);
      }
      if (profile.experienceYears !== undefined) {
        profileFields.push('experience_years = ?');
        profileParams.push(profile.experienceYears);
      }
      if (profile.workAddress !== undefined) {
        profileFields.push('work_address = ?');
        profileParams.push(profile.workAddress);
      }
      if (profile.latitude !== undefined) {
        profileFields.push('latitude = ?');
        profileParams.push(profile.latitude);
      }
      if (profile.longitude !== undefined) {
        profileFields.push('longitude = ?');
        profileParams.push(profile.longitude);
      }
      if (profile.workDays !== undefined) {
        profileFields.push('work_days = ?');
        profileParams.push(profile.workDays);
      }
      if (profile.workStartTime !== undefined) {
        profileFields.push('work_start_time = ?');
        profileParams.push(profile.workStartTime);
      }
      if (profile.workEndTime !== undefined) {
        profileFields.push('work_end_time = ?');
        profileParams.push(profile.workEndTime);
      }

      if (profileFields.length > 0) {
        const existingProfile = await connection.query('SELECT id FROM therapist_profiles WHERE user_id = ?', [userId]);
        if (existingProfile[0].length > 0) {
          await connection.query(`UPDATE therapist_profiles SET ${profileFields.join(', ')} WHERE user_id = ?`, [...profileParams, userId]);
        } else {
          await connection.query(
            `INSERT INTO therapist_profiles (user_id, ${profileFields.map(f => f.split(' ')[0]).join(', ')}) VALUES (?, ${profileFields.map(() => '?').join(', ')})`,
            [userId, ...profileParams]
          );
        }
      }
    }

    await connection.commit();

    successResponse(res, null, '更新成功');
  } catch (error) {
    await connection.rollback();
    console.error('更新个人资料错误:', error);
    errorResponse(res, '更新个人资料失败', 500);
  } finally {
    connection.release();
  }
}

async function getAdapters(req, res) {
  try {
    const { page = 1, pageSize = 10, keyword, specialty } = req.query;
    const { limit, offset } = paginate(page, pageSize);

    let whereClause = 'WHERE u.role = ? AND u.status = 1';
    const params = ['adapter'];

    if (keyword) {
      whereClause += ' AND (u.real_name LIKE ? OR u.phone LIKE ?)';
      const searchKeyword = `%${keyword}%`;
      params.push(searchKeyword, searchKeyword);
    }

    if (specialty) {
      whereClause += ' AND p.specialty LIKE ?';
      params.push(`%${specialty}%`);
    }

    const countResult = await query(
      `SELECT COUNT(*) as total FROM users u LEFT JOIN adapter_profiles p ON u.id = p.user_id ${whereClause}`,
      params
    );
    const total = countResult[0].total;

    const users = await query(
      `SELECT u.id, u.username, u.real_name, u.phone, u.email, u.avatar, u.address, u.latitude, u.longitude, 
              p.license_no, p.specialty, p.experience_years, p.work_area
       FROM users u 
       LEFT JOIN adapter_profiles p ON u.id = p.user_id 
       ${whereClause} 
       ORDER BY u.id DESC 
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const adapterList = users.map(user => ({
      id: user.id,
      username: user.username,
      realName: user.real_name,
      phone: user.phone,
      email: user.email,
      avatar: user.avatar,
      address: user.address,
      latitude: user.latitude,
      longitude: user.longitude,
      licenseNo: user.license_no,
      specialty: user.specialty,
      experienceYears: user.experience_years,
      workArea: user.work_area
    }));

    successResponse(res, {
      list: adapterList,
      total,
      page: parseInt(page),
      pageSize: parseInt(pageSize)
    }, '获取成功');
  } catch (error) {
    console.error('获取适配师列表错误:', error);
    errorResponse(res, '获取适配师列表失败', 500);
  }
}

async function getTherapists(req, res) {
  try {
    const { page = 1, pageSize = 10, keyword, specialty } = req.query;
    const { limit, offset } = paginate(page, pageSize);

    let whereClause = 'WHERE u.role = ? AND u.status = 1';
    const params = ['therapist'];

    if (keyword) {
      whereClause += ' AND (u.real_name LIKE ? OR u.phone LIKE ?)';
      const searchKeyword = `%${keyword}%`;
      params.push(searchKeyword, searchKeyword);
    }

    if (specialty) {
      whereClause += ' AND p.specialty LIKE ?';
      params.push(`%${specialty}%`);
    }

    const countResult = await query(
      `SELECT COUNT(*) as total FROM users u LEFT JOIN therapist_profiles p ON u.id = p.user_id ${whereClause}`,
      params
    );
    const total = countResult[0].total;

    const users = await query(
      `SELECT u.id, u.username, u.real_name, u.phone, u.email, u.avatar, u.address, u.latitude, u.longitude, 
              p.license_no, p.specialty, p.experience_years, p.work_address, p.work_days, p.work_start_time, p.work_end_time
       FROM users u 
       LEFT JOIN therapist_profiles p ON u.id = p.user_id 
       ${whereClause} 
       ORDER BY u.id DESC 
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const therapistList = users.map(user => ({
      id: user.id,
      username: user.username,
      realName: user.real_name,
      phone: user.phone,
      email: user.email,
      avatar: user.avatar,
      address: user.address,
      latitude: user.latitude,
      longitude: user.longitude,
      licenseNo: user.license_no,
      specialty: user.specialty,
      experienceYears: user.experience_years,
      workAddress: user.work_address,
      workDays: user.work_days,
      workStartTime: user.work_start_time,
      workEndTime: user.work_end_time
    }));

    successResponse(res, {
      list: therapistList,
      total,
      page: parseInt(page),
      pageSize: parseInt(pageSize)
    }, '获取成功');
  } catch (error) {
    console.error('获取康复师列表错误:', error);
    errorResponse(res, '获取康复师列表失败', 500);
  }
}

async function createUser(req, res) {
  const connection = await getConnection();
  try {
    await connection.beginTransaction();

    const { username, password, realName, phone, email, role, address, avatar, latitude, longitude, status, profile } = req.body;

    if (!username || !password || !realName || !phone || !role) {
      await connection.rollback();
      return errorResponse(res, '请填写必填项', 400);
    }

    const validRoles = ['disabled', 'adapter', 'therapist', 'finance', 'admin'];
    if (!validRoles.includes(role)) {
      await connection.rollback();
      return errorResponse(res, '无效的用户角色', 400);
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
      'INSERT INTO users (username, password, real_name, phone, email, role, address, avatar, latitude, longitude, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [username, hashedPassword, realName, phone, email || null, role, address || null, avatar || null, latitude || null, longitude || null, status !== undefined ? status : 1]
    );

    const userId = userResult.insertId;

    if (profile) {
      if (role === 'disabled') {
        await connection.query(
          'INSERT INTO disabled_profiles (user_id, disability_type, disability_level, height, weight, age, gender, medical_history, daily_needs, living_environment) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [
            userId,
            profile.disabilityType || null,
            profile.disabilityLevel || null,
            profile.height || null,
            profile.weight || null,
            profile.age || null,
            profile.gender || null,
            profile.medicalHistory || null,
            profile.dailyNeeds || null,
            profile.livingEnvironment || null
          ]
        );
      } else if (role === 'adapter') {
        await connection.query(
          'INSERT INTO adapter_profiles (user_id, license_no, specialty, experience_years, work_area) VALUES (?, ?, ?, ?, ?)',
          [
            userId,
            profile.licenseNo || null,
            profile.specialty || null,
            profile.experienceYears || null,
            profile.workArea || null
          ]
        );
      } else if (role === 'therapist') {
        await connection.query(
          'INSERT INTO therapist_profiles (user_id, license_no, specialty, experience_years, work_address, latitude, longitude, work_days, work_start_time, work_end_time) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [
            userId,
            profile.licenseNo || null,
            profile.specialty || null,
            profile.experienceYears || null,
            profile.workAddress || null,
            profile.latitude || null,
            profile.longitude || null,
            profile.workDays || '1,2,3,4,5',
            profile.workStartTime || '09:00:00',
            profile.workEndTime || '18:00:00'
          ]
        );
      }
    }

    await connection.commit();

    await createNotification(userId, 'system', '账号创建成功', `您的${role}账号已创建成功，请使用初始密码登录`);

    successResponse(res, { id: userId }, '创建成功');
  } catch (error) {
    await connection.rollback();
    console.error('创建用户错误:', error);
    errorResponse(res, '创建用户失败', 500);
  } finally {
    connection.release();
  }
}

module.exports = {
  getUsers,
  getUserById,
  updateUser,
  updateProfile,
  getAdapters,
  getTherapists,
  createUser
};
