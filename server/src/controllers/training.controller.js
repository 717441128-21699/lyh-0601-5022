const { query, getConnection } = require('../config/database');
const { successResponse, errorResponse, paginate, parseJsonField } = require('../utils/helpers');
const { createNotification } = require('../services/notification.service');

async function createTrainingPlan(req, res) {
  try {
    const { user_id, plan_name, plan_description, exercises, target_duration, initial_intensity, initial_frequency, notes } = req.body;
    const therapist_id = req.user.id;

    if (!user_id || !plan_name || !exercises) {
      return errorResponse(res, '用户ID、计划名称和训练内容不能为空');
    }

    const users = await query('SELECT id, role FROM users WHERE id = ?', [user_id]);
    if (users.length === 0) {
      return errorResponse(res, '用户不存在');
    }

    const exercisesJson = JSON.stringify(exercises);

    const result = await query(
      'INSERT INTO training_plans (user_id, therapist_id, plan_name, plan_description, exercises, target_duration, current_intensity, current_frequency, initial_intensity, initial_frequency, notes, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [user_id, therapist_id, plan_name, plan_description || null, exercisesJson, target_duration || null, initial_intensity || 1, initial_frequency || 3, initial_intensity || 1, initial_frequency || 3, notes || null, 'active']
    );

    const plans = await query('SELECT * FROM training_plans WHERE id = ?', [result.insertId]);
    const plan = plans[0];
    plan.exercises = parseJsonField(plan.exercises, []);

    await createNotification(
      user_id,
      'training',
      '新训练计划已创建',
      `康复师为您创建了新的训练计划：${plan_name}`,
      'training_plan',
      result.insertId
    );

    successResponse(res, plan, '训练计划创建成功');
  } catch (error) {
    console.error('创建训练计划错误:', error);
    errorResponse(res, '创建训练计划失败', 500);
  }
}

async function getTrainingPlans(req, res) {
  try {
    const { page = 1, pageSize = 10, status, keyword } = req.query;
    const { limit, offset } = paginate(page, pageSize);

    let sql = 'SELECT tp.*, u.real_name as user_name, t.real_name as therapist_name FROM training_plans tp LEFT JOIN users u ON tp.user_id = u.id LEFT JOIN users t ON tp.therapist_id = t.id WHERE 1=1';
    const params = [];

    if (req.user.role === 'disabled') {
      sql += ' AND tp.user_id = ?';
      params.push(req.user.id);
    } else if (req.user.role === 'therapist') {
      sql += ' AND tp.therapist_id = ?';
      params.push(req.user.id);
    }

    if (status) {
      sql += ' AND tp.status = ?';
      params.push(status);
    }

    if (keyword) {
      sql += ' AND tp.plan_name LIKE ?';
      params.push(`%${keyword}%`);
    }

    const countSql = sql.replace('SELECT tp.*, u.real_name as user_name, t.real_name as therapist_name', 'SELECT COUNT(*) as total');
    const countResult = await query(countSql, params);
    const total = countResult[0].total;

    sql += ' ORDER BY tp.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const plans = await query(sql, params);
    const planList = plans.map(plan => ({
      ...plan,
      exercises: parseJsonField(plan.exercises, [])
    }));

    successResponse(res, {
      list: planList,
      total,
      page: parseInt(page),
      pageSize: parseInt(pageSize)
    }, '获取训练计划列表成功');
  } catch (error) {
    console.error('获取训练计划列表错误:', error);
    errorResponse(res, '获取训练计划列表失败', 500);
  }
}

async function getTrainingPlanDetail(req, res) {
  try {
    const { id } = req.params;

    const plans = await query(
      'SELECT tp.*, u.real_name as user_name, t.real_name as therapist_name FROM training_plans tp LEFT JOIN users u ON tp.user_id = u.id LEFT JOIN users t ON tp.therapist_id = t.id WHERE tp.id = ?',
      [id]
    );

    if (plans.length === 0) {
      return errorResponse(res, '训练计划不存在', 404);
    }

    const plan = plans[0];

    if (req.user.role === 'disabled' && plan.user_id !== req.user.id) {
      return errorResponse(res, '权限不足', 403);
    }

    if (req.user.role === 'therapist' && plan.therapist_id !== req.user.id) {
      return errorResponse(res, '权限不足', 403);
    }

    plan.exercises = parseJsonField(plan.exercises, []);

    successResponse(res, plan, '获取训练计划详情成功');
  } catch (error) {
    console.error('获取训练计划详情错误:', error);
    errorResponse(res, '获取训练计划详情失败', 500);
  }
}

async function updateTrainingPlan(req, res) {
  try {
    const { id } = req.params;
    const { plan_name, plan_description, exercises, target_duration, notes } = req.body;

    const plans = await query('SELECT * FROM training_plans WHERE id = ?', [id]);
    if (plans.length === 0) {
      return errorResponse(res, '训练计划不存在', 404);
    }

    const plan = plans[0];

    if (req.user.role === 'therapist' && plan.therapist_id !== req.user.id) {
      return errorResponse(res, '权限不足', 403);
    }

    const updateFields = [];
    const updateParams = [];

    if (plan_name !== undefined) {
      updateFields.push('plan_name = ?');
      updateParams.push(plan_name);
    }
    if (plan_description !== undefined) {
      updateFields.push('plan_description = ?');
      updateParams.push(plan_description);
    }
    if (exercises !== undefined) {
      updateFields.push('exercises = ?');
      updateParams.push(JSON.stringify(exercises));
    }
    if (target_duration !== undefined) {
      updateFields.push('target_duration = ?');
      updateParams.push(target_duration);
    }
    if (notes !== undefined) {
      updateFields.push('notes = ?');
      updateParams.push(notes);
    }

    if (updateFields.length === 0) {
      return errorResponse(res, '没有需要更新的字段');
    }

    updateParams.push(id);

    await query(`UPDATE training_plans SET ${updateFields.join(', ')} WHERE id = ?`, updateParams);

    const updatedPlans = await query('SELECT * FROM training_plans WHERE id = ?', [id]);
    const updatedPlan = updatedPlans[0];
    updatedPlan.exercises = parseJsonField(updatedPlan.exercises, []);

    await createNotification(
      plan.user_id,
      'training',
      '训练计划已更新',
      `康复师更新了训练计划：${updatedPlan.plan_name}`,
      'training_plan',
      id
    );

    successResponse(res, updatedPlan, '训练计划更新成功');
  } catch (error) {
    console.error('更新训练计划错误:', error);
    errorResponse(res, '更新训练计划失败', 500);
  }
}

async function updateTrainingPlanStatus(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['active', 'paused', 'completed', 'cancelled'].includes(status)) {
      return errorResponse(res, '无效的状态值');
    }

    const plans = await query('SELECT * FROM training_plans WHERE id = ?', [id]);
    if (plans.length === 0) {
      return errorResponse(res, '训练计划不存在', 404);
    }

    const plan = plans[0];

    if (req.user.role === 'therapist' && plan.therapist_id !== req.user.id) {
      return errorResponse(res, '权限不足', 403);
    }

    await query('UPDATE training_plans SET status = ? WHERE id = ?', [status, id]);

    const statusText = {
      active: '进行中',
      paused: '已暂停',
      completed: '已完成',
      cancelled: '已取消'
    };

    await createNotification(
      plan.user_id,
      'training',
      '训练计划状态更新',
      `您的训练计划「${plan.plan_name}」状态已更新为：${statusText[status]}`,
      'training_plan',
      id
    );

    const updatedPlans = await query('SELECT * FROM training_plans WHERE id = ?', [id]);
    const updatedPlan = updatedPlans[0];
    updatedPlan.exercises = parseJsonField(updatedPlan.exercises, []);

    successResponse(res, updatedPlan, '状态更新成功');
  } catch (error) {
    console.error('更新训练计划状态错误:', error);
    errorResponse(res, '更新训练计划状态失败', 500);
  }
}

function calculateAdjustment(completionRate, currentIntensity, currentFrequency) {
  let nextIntensity = currentIntensity;
  let nextFrequency = currentFrequency;
  let adjustmentReason = '';

  if (completionRate >= 90) {
    nextIntensity = Math.min(currentIntensity + 1, 10);
    nextFrequency = Math.min(currentFrequency + 1, 7);
    adjustmentReason = '完成度优秀，提升训练强度和频率';
  } else if (completionRate >= 70) {
    adjustmentReason = '完成度良好，保持当前训练强度和频率';
  } else if (completionRate >= 50) {
    nextIntensity = Math.max(currentIntensity - 1, 1);
    adjustmentReason = '完成度一般，适当降低训练强度';
  } else {
    nextIntensity = Math.max(currentIntensity - 2, 1);
    nextFrequency = Math.max(currentFrequency - 1, 1);
    adjustmentReason = '完成度较低，降低训练强度和频率';
  }

  return { nextIntensity, nextFrequency, adjustmentReason };
}

async function createTrainingRecord(req, res) {
  const connection = await getConnection();
  try {
    await connection.beginTransaction();

    const { plan_id, training_date, completion_rate, duration, actual_exercises, feedback, notes } = req.body;
    const therapist_id = req.user.id;

    if (!plan_id || completion_rate === undefined) {
      await connection.rollback();
      return errorResponse(res, '计划ID和完成率不能为空');
    }

    const [plansResult] = await connection.query('SELECT * FROM training_plans WHERE id = ?', [plan_id]);
    if (plansResult.length === 0) {
      await connection.rollback();
      return errorResponse(res, '训练计划不存在', 404);
    }

    const plan = plansResult[0];

    if (req.user.role === 'therapist' && plan.therapist_id !== therapist_id) {
      await connection.rollback();
      return errorResponse(res, '权限不足', 403);
    }

    const { nextIntensity, nextFrequency, adjustmentReason } = calculateAdjustment(
      completion_rate,
      plan.current_intensity,
      plan.current_frequency
    );

    const actualExercisesJson = actual_exercises ? JSON.stringify(actual_exercises) : null;

    const [recordResult] = await connection.query(
      'INSERT INTO training_records (plan_id, user_id, therapist_id, training_date, completion_rate, duration, actual_exercises, feedback, notes, current_intensity, current_frequency, next_intensity, next_frequency, adjustment_reason) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [plan_id, plan.user_id, therapist_id, training_date || new Date(), completion_rate, duration || null, actualExercisesJson, feedback || null, notes || null, plan.current_intensity, plan.current_frequency, nextIntensity, nextFrequency, adjustmentReason]
    );

    await connection.query(
      'UPDATE training_plans SET current_intensity = ?, current_frequency = ?, last_training_date = ? WHERE id = ?',
      [nextIntensity, nextFrequency, training_date || new Date(), plan_id]
    );

    await connection.commit();

    const [records] = await connection.query('SELECT * FROM training_records WHERE id = ?', [recordResult.insertId]);
    const record = records[0];
    record.actual_exercises = parseJsonField(record.actual_exercises, []);

    await createNotification(
      plan.user_id,
      'training',
      '训练记录已提交',
      `您的训练计划「${plan.plan_name}」有新的训练记录，${adjustmentReason}`,
      'training_record',
      recordResult.insertId
    );

    successResponse(res, record, '训练记录创建成功');
  } catch (error) {
    await connection.rollback();
    console.error('创建训练记录错误:', error);
    errorResponse(res, '创建训练记录失败', 500);
  } finally {
    connection.release();
  }
}

async function getTrainingRecords(req, res) {
  try {
    const { page = 1, pageSize = 10, plan_id, start_date, end_date } = req.query;
    const { limit, offset } = paginate(page, pageSize);

    let sql = 'SELECT tr.*, tp.plan_name, u.real_name as user_name, t.real_name as therapist_name FROM training_records tr LEFT JOIN training_plans tp ON tr.plan_id = tp.id LEFT JOIN users u ON tr.user_id = u.id LEFT JOIN users t ON tr.therapist_id = t.id WHERE 1=1';
    const params = [];

    if (req.user.role === 'disabled') {
      sql += ' AND tr.user_id = ?';
      params.push(req.user.id);
    } else if (req.user.role === 'therapist') {
      sql += ' AND tr.therapist_id = ?';
      params.push(req.user.id);
    }

    if (plan_id) {
      sql += ' AND tr.plan_id = ?';
      params.push(plan_id);
    }

    if (start_date) {
      sql += ' AND tr.training_date >= ?';
      params.push(start_date);
    }

    if (end_date) {
      sql += ' AND tr.training_date <= ?';
      params.push(end_date);
    }

    const countSql = sql.replace('SELECT tr.*, tp.plan_name, u.real_name as user_name, t.real_name as therapist_name', 'SELECT COUNT(*) as total');
    const countResult = await query(countSql, params);
    const total = countResult[0].total;

    sql += ' ORDER BY tr.training_date DESC, tr.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const records = await query(sql, params);
    const recordList = records.map(record => ({
      ...record,
      actual_exercises: parseJsonField(record.actual_exercises, [])
    }));

    successResponse(res, {
      list: recordList,
      total,
      page: parseInt(page),
      pageSize: parseInt(pageSize)
    }, '获取训练记录列表成功');
  } catch (error) {
    console.error('获取训练记录列表错误:', error);
    errorResponse(res, '获取训练记录列表失败', 500);
  }
}

async function getTrainingRecordDetail(req, res) {
  try {
    const { id } = req.params;

    const records = await query(
      'SELECT tr.*, tp.plan_name, u.real_name as user_name, t.real_name as therapist_name FROM training_records tr LEFT JOIN training_plans tp ON tr.plan_id = tp.id LEFT JOIN users u ON tr.user_id = u.id LEFT JOIN users t ON tr.therapist_id = t.id WHERE tr.id = ?',
      [id]
    );

    if (records.length === 0) {
      return errorResponse(res, '训练记录不存在', 404);
    }

    const record = records[0];

    if (req.user.role === 'disabled' && record.user_id !== req.user.id) {
      return errorResponse(res, '权限不足', 403);
    }

    if (req.user.role === 'therapist' && record.therapist_id !== req.user.id) {
      return errorResponse(res, '权限不足', 403);
    }

    record.actual_exercises = parseJsonField(record.actual_exercises, []);

    successResponse(res, record, '获取训练记录详情成功');
  } catch (error) {
    console.error('获取训练记录详情错误:', error);
    errorResponse(res, '获取训练记录详情失败', 500);
  }
}

async function getPlanRecords(req, res) {
  try {
    const { id } = req.params;
    const { page = 1, pageSize = 20 } = req.query;
    const { limit, offset } = paginate(page, pageSize);

    const plans = await query('SELECT * FROM training_plans WHERE id = ?', [id]);
    if (plans.length === 0) {
      return errorResponse(res, '训练计划不存在', 404);
    }

    const plan = plans[0];

    if (req.user.role === 'disabled' && plan.user_id !== req.user.id) {
      return errorResponse(res, '权限不足', 403);
    }

    if (req.user.role === 'therapist' && plan.therapist_id !== req.user.id) {
      return errorResponse(res, '权限不足', 403);
    }

    const countResult = await query('SELECT COUNT(*) as total FROM training_records WHERE plan_id = ?', [id]);
    const total = countResult[0].total;

    const records = await query(
      'SELECT * FROM training_records WHERE plan_id = ? ORDER BY training_date DESC, created_at DESC LIMIT ? OFFSET ?',
      [id, limit, offset]
    );

    const recordList = records.map(record => ({
      ...record,
      actual_exercises: parseJsonField(record.actual_exercises, [])
    }));

    successResponse(res, {
      list: recordList,
      total,
      page: parseInt(page),
      pageSize: parseInt(pageSize)
    }, '获取计划训练记录成功');
  } catch (error) {
    console.error('获取计划训练记录错误:', error);
    errorResponse(res, '获取计划训练记录失败', 500);
  }
}

async function getPlanProgress(req, res) {
  try {
    const { id } = req.params;

    const plans = await query('SELECT * FROM training_plans WHERE id = ?', [id]);
    if (plans.length === 0) {
      return errorResponse(res, '训练计划不存在', 404);
    }

    const plan = plans[0];

    if (req.user.role === 'disabled' && plan.user_id !== req.user.id) {
      return errorResponse(res, '权限不足', 403);
    }

    if (req.user.role === 'therapist' && plan.therapist_id !== req.user.id) {
      return errorResponse(res, '权限不足', 403);
    }

    const records = await query(
      'SELECT * FROM training_records WHERE plan_id = ? ORDER BY training_date ASC',
      [id]
    );

    const totalRecords = records.length;
    const avgCompletionRate = totalRecords > 0 
      ? Math.round(records.reduce((sum, r) => sum + r.completion_rate, 0) / totalRecords) 
      : 0;

    const intensityChanges = records.map(r => ({
      date: r.training_date,
      intensity: r.current_intensity,
      completionRate: r.completion_rate
    }));

    const recentRecords = records.slice(-7).reverse();

    const progressData = {
      planId: plan.id,
      planName: plan.plan_name,
      status: plan.status,
      currentIntensity: plan.current_intensity,
      currentFrequency: plan.current_frequency,
      initialIntensity: plan.initial_intensity,
      initialFrequency: plan.initial_frequency,
      totalTrainingCount: totalRecords,
      avgCompletionRate,
      lastTrainingDate: plan.last_training_date,
      intensityChanges,
      recentRecords: recentRecords.map(r => ({
        id: r.id,
        trainingDate: r.training_date,
        completionRate: r.completion_rate,
        duration: r.duration,
        adjustmentReason: r.adjustment_reason
      }))
    };

    successResponse(res, progressData, '获取训练进度统计成功');
  } catch (error) {
    console.error('获取训练进度统计错误:', error);
    errorResponse(res, '获取训练进度统计失败', 500);
  }
}

module.exports = {
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
};
