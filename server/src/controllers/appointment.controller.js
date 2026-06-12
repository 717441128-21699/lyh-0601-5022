const { query, getConnection } = require('../config/database');
const { successResponse, errorResponse, paginate, calculateDistance, parseJsonField } = require('../utils/helpers');
const { createNotification } = require('../services/notification.service');

function generateTimeSlots(startTime, endTime, duration = 60) {
  const slots = [];
  const start = parseTimeToMinutes(startTime);
  const end = parseTimeToMinutes(endTime);
  
  for (let time = start; time + duration <= end; time += duration) {
    slots.push({
      startTime: minutesToTime(time),
      endTime: minutesToTime(time + duration)
    });
  }
  
  return slots;
}

function parseTimeToMinutes(timeStr) {
  const parts = timeStr.split(':');
  return parseInt(parts[0]) * 60 + parseInt(parts[1]);
}

function minutesToTime(minutes) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:00`;
}

function getDayOfWeek(dateStr) {
  const date = new Date(dateStr);
  return date.getDay();
}

async function getTherapistAvailableSlots(therapistId, date) {
  const profiles = await query('SELECT * FROM therapist_profiles WHERE user_id = ?', [therapistId]);
  if (profiles.length === 0) {
    return [];
  }

  const profile = profiles[0];
  const dayOfWeek = getDayOfWeek(date);
  const workDays = profile.work_days ? profile.work_days.split(',').map(Number) : [1, 2, 3, 4, 5];

  if (!workDays.includes(dayOfWeek)) {
    return [];
  }

  const allSlots = generateTimeSlots(profile.work_start_time, profile.work_end_time);

  const appointments = await query(
    'SELECT appointment_time, duration FROM appointments WHERE therapist_id = ? AND DATE(appointment_time) = ? AND status NOT IN (?)',
    [therapistId, date, ['cancelled', 'completed']]
  );

  const occupiedSlots = appointments.map(apt => {
    const aptTime = apt.appointment_time.toTimeString().slice(0, 8);
    const aptDuration = apt.duration || 60;
    const startMinutes = parseTimeToMinutes(aptTime);
    const endMinutes = startMinutes + aptDuration;
    return { start: startMinutes, end: endMinutes };
  });

  const availableSlots = allSlots.filter(slot => {
    const slotStart = parseTimeToMinutes(slot.startTime);
    const slotEnd = parseTimeToMinutes(slot.endTime);
    return !occupiedSlots.some(occupied => 
      slotStart < occupied.end && slotEnd > occupied.start
    );
  });

  return availableSlots;
}

async function getAvailableAppointments(req, res) {
  try {
    const { date, latitude, longitude, specialty, page = 1, pageSize = 10 } = req.query;
    const targetDate = date || new Date().toISOString().split('T')[0];

    let userLat = latitude;
    let userLng = longitude;

    if (!userLat || !userLng) {
      const users = await query('SELECT latitude, longitude FROM users WHERE id = ?', [req.user.id]);
      if (users.length > 0 && users[0].latitude && users[0].longitude) {
        userLat = users[0].latitude;
        userLng = users[0].longitude;
      }
    }

    let whereClause = 'WHERE u.role = ? AND u.status = 1';
    const params = ['therapist'];

    if (specialty) {
      whereClause += ' AND p.specialty LIKE ?';
      params.push(`%${specialty}%`);
    }

    const therapists = await query(
      `SELECT u.id, u.real_name, u.avatar, u.phone, u.address, u.latitude, u.longitude,
              p.license_no, p.specialty, p.experience_years, p.work_address, p.work_days, p.work_start_time, p.work_end_time
       FROM users u 
       LEFT JOIN therapist_profiles p ON u.id = p.user_id 
       ${whereClause}`,
      params
    );

    const therapistsWithDistance = therapists.map(therapist => {
      let distance = null;
      if (userLat && userLng && therapist.latitude && therapist.longitude) {
        distance = calculateDistance(
          parseFloat(userLat),
          parseFloat(userLng),
          therapist.latitude,
          therapist.longitude
        );
      }
      return { ...therapist, distance };
    });

    const dayOfWeek = getDayOfWeek(targetDate);
    const workingTherapists = therapistsWithDistance.filter(t => {
      if (!t.work_days) return false;
      const workDays = t.work_days.split(',').map(Number);
      return workDays.includes(dayOfWeek);
    });

    const therapistsWithSlots = [];
    for (const therapist of workingTherapists) {
      const slots = await getTherapistAvailableSlots(therapist.id, targetDate);
      if (slots.length > 0) {
        therapistsWithSlots.push({
          id: therapist.id,
          realName: therapist.real_name,
          avatar: therapist.avatar,
          phone: therapist.phone,
          address: therapist.address,
          distance: therapist.distance,
          specialty: therapist.specialty,
          experienceYears: therapist.experience_years,
          workAddress: therapist.work_address,
          availableSlots: slots
        });
      }
    }

    therapistsWithSlots.sort((a, b) => {
      if (a.distance !== null && b.distance !== null) {
        const distanceDiff = a.distance - b.distance;
        if (Math.abs(distanceDiff) > 0.1) {
          return distanceDiff;
        }
      }
      return b.availableSlots.length - a.availableSlots.length;
    });

    const { limit, offset } = paginate(page, pageSize);
    const total = therapistsWithSlots.length;
    const paginatedList = therapistsWithSlots.slice(offset, offset + limit);

    successResponse(res, {
      list: paginatedList,
      total,
      page: parseInt(page),
      pageSize: parseInt(pageSize),
      date: targetDate
    }, '获取可用预约时段成功');
  } catch (error) {
    console.error('获取可用预约时段错误:', error);
    errorResponse(res, '获取可用预约时段失败', 500);
  }
}

async function createAppointment(req, res) {
  try {
    const { therapist_id, appointment_time, duration, service_type, notes } = req.body;
    const user_id = req.user.id;

    if (!therapist_id || !appointment_time) {
      return errorResponse(res, '康复师ID和预约时间不能为空');
    }

    const therapists = await query('SELECT id, real_name, role FROM users WHERE id = ? AND role = ?', [therapist_id, 'therapist']);
    if (therapists.length === 0) {
      return errorResponse(res, '康复师不存在');
    }

    const appointmentDate = appointment_time.split(' ')[0] || appointment_time.split('T')[0];
    const availableSlots = await getTherapistAvailableSlots(therapist_id, appointmentDate);
    
    const timeStr = appointment_time.includes('T') 
      ? appointment_time.split('T')[1].slice(0, 8)
      : appointment_time.split(' ')[1] || '00:00:00';

    const slotAvailable = availableSlots.some(slot => slot.startTime === timeStr);
    
    if (!slotAvailable) {
      return errorResponse(res, '该时段已被预约，请选择其他时间');
    }

    const result = await query(
      'INSERT INTO appointments (user_id, therapist_id, appointment_time, duration, service_type, notes, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [user_id, therapist_id, appointment_time, duration || 60, service_type || null, notes || null, 'pending']
    );

    const appointments = await query('SELECT * FROM appointments WHERE id = ?', [result.insertId]);
    const appointment = appointments[0];

    await createNotification(
      therapist_id,
      'appointment',
      '新的预约申请',
      `有新的预约申请，时间：${appointment_time}`,
      'appointment',
      result.insertId
    );

    successResponse(res, appointment, '预约创建成功');
  } catch (error) {
    console.error('创建预约错误:', error);
    errorResponse(res, '创建预约失败', 500);
  }
}

async function getAppointments(req, res) {
  try {
    const { page = 1, pageSize = 10, status, date, therapist_id } = req.query;
    const { limit, offset } = paginate(page, pageSize);

    let sql = 'SELECT a.*, u.real_name as user_name, u.avatar as user_avatar, u.phone as user_phone, t.real_name as therapist_name, t.avatar as therapist_avatar, t.phone as therapist_phone FROM appointments a LEFT JOIN users u ON a.user_id = u.id LEFT JOIN users t ON a.therapist_id = t.id WHERE 1=1';
    const params = [];

    if (req.user.role === 'disabled') {
      sql += ' AND a.user_id = ?';
      params.push(req.user.id);
    } else if (req.user.role === 'therapist') {
      sql += ' AND a.therapist_id = ?';
      params.push(req.user.id);
    }

    if (status) {
      sql += ' AND a.status = ?';
      params.push(status);
    }

    if (date) {
      sql += ' AND DATE(a.appointment_time) = ?';
      params.push(date);
    }

    if (therapist_id && req.user.role !== 'therapist') {
      sql += ' AND a.therapist_id = ?';
      params.push(therapist_id);
    }

    const countSql = sql.replace('SELECT a.*, u.real_name as user_name, u.avatar as user_avatar, u.phone as user_phone, t.real_name as therapist_name, t.avatar as therapist_avatar, t.phone as therapist_phone', 'SELECT COUNT(*) as total');
    const countResult = await query(countSql, params);
    const total = countResult[0].total;

    sql += ' ORDER BY a.appointment_time DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const appointments = await query(sql, params);

    successResponse(res, {
      list: appointments,
      total,
      page: parseInt(page),
      pageSize: parseInt(pageSize)
    }, '获取预约列表成功');
  } catch (error) {
    console.error('获取预约列表错误:', error);
    errorResponse(res, '获取预约列表失败', 500);
  }
}

async function getAppointmentDetail(req, res) {
  try {
    const { id } = req.params;

    const appointments = await query(
      'SELECT a.*, u.real_name as user_name, u.avatar as user_avatar, u.phone as user_phone, t.real_name as therapist_name, t.avatar as therapist_avatar, t.phone as therapist_phone FROM appointments a LEFT JOIN users u ON a.user_id = u.id LEFT JOIN users t ON a.therapist_id = t.id WHERE a.id = ?',
      [id]
    );

    if (appointments.length === 0) {
      return errorResponse(res, '预约不存在', 404);
    }

    const appointment = appointments[0];

    if (req.user.role === 'disabled' && appointment.user_id !== req.user.id) {
      return errorResponse(res, '权限不足', 403);
    }

    if (req.user.role === 'therapist' && appointment.therapist_id !== req.user.id) {
      return errorResponse(res, '权限不足', 403);
    }

    successResponse(res, appointment, '获取预约详情成功');
  } catch (error) {
    console.error('获取预约详情错误:', error);
    errorResponse(res, '获取预约详情失败', 500);
  }
}

async function updateAppointmentStatus(req, res) {
  try {
    const { id } = req.params;
    const { status, remark } = req.body;

    if (!['confirmed', 'cancelled', 'completed', 'no_show'].includes(status)) {
      return errorResponse(res, '无效的状态值');
    }

    const appointments = await query('SELECT * FROM appointments WHERE id = ?', [id]);
    if (appointments.length === 0) {
      return errorResponse(res, '预约不存在', 404);
    }

    const appointment = appointments[0];

    if (req.user.role === 'disabled' && appointment.user_id !== req.user.id) {
      return errorResponse(res, '权限不足', 403);
    }

    if (req.user.role === 'therapist' && appointment.therapist_id !== req.user.id) {
      return errorResponse(res, '权限不足', 403);
    }

    if (appointment.status === 'cancelled' || appointment.status === 'completed') {
      return errorResponse(res, '当前状态不能修改');
    }

    if (status === 'confirmed' && req.user.role === 'disabled') {
      return errorResponse(res, '只有康复师才能确认预约', 403);
    }

    if (status === 'completed' && req.user.role === 'disabled') {
      return errorResponse(res, '只有康复师才能完成预约', 403);
    }

    await query('UPDATE appointments SET status = ?, remark = ? WHERE id = ?', [status, remark || null, id]);

    const statusText = {
      confirmed: '已确认',
      cancelled: '已取消',
      completed: '已完成',
      no_show: '未到场'
    };

    const notifyUserId = req.user.role === 'therapist' ? appointment.user_id : appointment.therapist_id;

    await createNotification(
      notifyUserId,
      'appointment',
      `预约${statusText[status]}`,
      `您的预约状态已更新为：${statusText[status]}`,
      'appointment',
      id
    );

    const updatedAppointments = await query('SELECT * FROM appointments WHERE id = ?', [id]);

    successResponse(res, updatedAppointments[0], '状态更新成功');
  } catch (error) {
    console.error('更新预约状态错误:', error);
    errorResponse(res, '更新预约状态失败', 500);
  }
}

async function rescheduleAppointment(req, res) {
  try {
    const { id } = req.params;
    const { new_appointment_time, new_duration, reason } = req.body;

    if (!new_appointment_time) {
      return errorResponse(res, '新的预约时间不能为空');
    }

    const appointments = await query('SELECT * FROM appointments WHERE id = ?', [id]);
    if (appointments.length === 0) {
      return errorResponse(res, '预约不存在', 404);
    }

    const appointment = appointments[0];

    if (appointment.status === 'cancelled' || appointment.status === 'completed') {
      return errorResponse(res, '当前状态不能改期');
    }

    if (req.user.role === 'disabled' && appointment.user_id !== req.user.id) {
      return errorResponse(res, '权限不足', 403);
    }

    if (req.user.role === 'therapist' && appointment.therapist_id !== req.user.id) {
      return errorResponse(res, '权限不足', 403);
    }

    const newDate = new_appointment_time.split(' ')[0] || new_appointment_time.split('T')[0];
    const availableSlots = await getTherapistAvailableSlots(appointment.therapist_id, newDate);
    
    const timeStr = new_appointment_time.includes('T') 
      ? new_appointment_time.split('T')[1].slice(0, 8)
      : new_appointment_time.split(' ')[1] || '00:00:00';

    const slotAvailable = availableSlots.some(slot => slot.startTime === timeStr);
    
    if (!slotAvailable) {
      return errorResponse(res, '该时段已被预约，请选择其他时间');
    }

    await query(
      'UPDATE appointments SET appointment_time = ?, duration = ?, status = ?, reschedule_reason = ?, reschedule_count = reschedule_count + 1 WHERE id = ?',
      [new_appointment_time, new_duration || appointment.duration, 'pending', reason || null, id]
    );

    const notifyUserId = req.user.role === 'therapist' ? appointment.user_id : appointment.therapist_id;

    await createNotification(
      notifyUserId,
      'appointment',
      '预约已改期',
      `预约时间已变更为：${new_appointment_time}`,
      'appointment',
      id
    );

    const updatedAppointments = await query('SELECT * FROM appointments WHERE id = ?', [id]);

    successResponse(res, updatedAppointments[0], '改期成功');
  } catch (error) {
    console.error('改期错误:', error);
    errorResponse(res, '改期失败', 500);
  }
}

async function getTherapistSlots(req, res) {
  try {
    const { therapistId } = req.params;
    const { date } = req.query;
    const targetDate = date || new Date().toISOString().split('T')[0];

    const therapists = await query('SELECT id, role FROM users WHERE id = ? AND role = ?', [therapistId, 'therapist']);
    if (therapists.length === 0) {
      return errorResponse(res, '康复师不存在', 404);
    }

    const slots = await getTherapistAvailableSlots(therapistId, targetDate);

    successResponse(res, {
      date: targetDate,
      therapistId,
      availableSlots: slots
    }, '获取康复师空闲时段成功');
  } catch (error) {
    console.error('获取康复师空闲时段错误:', error);
    errorResponse(res, '获取康复师空闲时段失败', 500);
  }
}

module.exports = {
  getAvailableAppointments,
  createAppointment,
  getAppointments,
  getAppointmentDetail,
  updateAppointmentStatus,
  rescheduleAppointment,
  getTherapistSlots
};
