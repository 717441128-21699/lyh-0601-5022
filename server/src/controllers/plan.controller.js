const { query, getConnection } = require('../config/database');
const { successResponse, errorResponse, paginate, parseJsonField, generateOrderNo } = require('../utils/helpers');
const { createNotification } = require('../services/notification.service');

async function createPlan(req, res) {
  try {
    const { assessment_id, plan_name, plan_description, devices, usage_instructions, precautions, estimated_effect, total_price } = req.body;
    const adapter_id = req.user.id;

    if (!assessment_id || !plan_name || !devices) {
      return errorResponse(res, '评估记录ID、方案名称和设备列表不能为空');
    }

    const assessments = await query('SELECT * FROM assessments WHERE id = ?', [assessment_id]);
    if (assessments.length === 0) {
      return errorResponse(res, '评估记录不存在');
    }

    const assessment = assessments[0];
    const devicesJson = JSON.stringify(devices);

    const result = await query(
      'INSERT INTO adaptation_plans (assessment_id, user_id, adapter_id, plan_name, plan_description, devices, usage_instructions, precautions, estimated_effect, total_price, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [assessment_id, assessment.user_id, adapter_id, plan_name, plan_description || null, devicesJson, usage_instructions || null, precautions || null, estimated_effect || null, total_price || 0, 'draft']
    );

    const plans = await query('SELECT * FROM adaptation_plans WHERE id = ?', [result.insertId]);
    const plan = plans[0];
    plan.devices = parseJsonField(plan.devices, []);

    await createNotification(
      assessment.user_id,
      'plan',
      '新的适配方案已生成',
      `适配师为您生成了新的适配方案：${plan_name}`,
      'plan',
      result.insertId
    );

    successResponse(res, plan, '方案创建成功');
  } catch (error) {
    console.error('创建方案错误:', error);
    errorResponse(res, '创建方案失败', 500);
  }
}

async function getPlans(req, res) {
  try {
    const { page = 1, pageSize = 10, status, keyword } = req.query;
    const { limit, offset } = paginate(page, pageSize);

    let sql = 'SELECT ap.*, a.real_name as adapter_name, u.real_name as user_name FROM adaptation_plans ap LEFT JOIN users a ON ap.adapter_id = a.id LEFT JOIN users u ON ap.user_id = u.id WHERE 1=1';
    const params = [];

    if (req.user.role === 'disabled') {
      sql += ' AND ap.user_id = ?';
      params.push(req.user.id);
    } else if (req.user.role === 'adapter') {
      sql += ' AND ap.adapter_id = ?';
      params.push(req.user.id);
    }

    if (status) {
      sql += ' AND ap.status = ?';
      params.push(status);
    }

    if (keyword) {
      sql += ' AND ap.plan_name LIKE ?';
      params.push(`%${keyword}%`);
    }

    const countSql = sql.replace('SELECT ap.*, a.real_name as adapter_name, u.real_name as user_name', 'SELECT COUNT(*) as total');
    const countResult = await query(countSql, params);
    const total = countResult[0].total;

    sql += ' ORDER BY ap.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const plans = await query(sql, params);
    const planList = plans.map(plan => ({
      ...plan,
      devices: parseJsonField(plan.devices, [])
    }));

    successResponse(res, {
      list: planList,
      total,
      page: parseInt(page),
      pageSize: parseInt(pageSize)
    }, '获取方案列表成功');
  } catch (error) {
    console.error('获取方案列表错误:', error);
    errorResponse(res, '获取方案列表失败', 500);
  }
}

async function getPlanDetail(req, res) {
  try {
    const { id } = req.params;

    const plans = await query(
      'SELECT ap.*, a.real_name as adapter_name, u.real_name as user_name FROM adaptation_plans ap LEFT JOIN users a ON ap.adapter_id = a.id LEFT JOIN users u ON ap.user_id = u.id WHERE ap.id = ?',
      [id]
    );

    if (plans.length === 0) {
      return errorResponse(res, '方案不存在', 404);
    }

    const plan = plans[0];

    if (req.user.role === 'disabled' && plan.user_id !== req.user.id) {
      return errorResponse(res, '权限不足', 403);
    }

    if (req.user.role === 'adapter' && plan.adapter_id !== req.user.id) {
      return errorResponse(res, '权限不足', 403);
    }

    plan.devices = parseJsonField(plan.devices, []);

    successResponse(res, plan, '获取方案详情成功');
  } catch (error) {
    console.error('获取方案详情错误:', error);
    errorResponse(res, '获取方案详情失败', 500);
  }
}

async function updatePlan(req, res) {
  try {
    const { id } = req.params;
    const { plan_name, plan_description, devices, usage_instructions, precautions, estimated_effect, total_price } = req.body;

    const plans = await query('SELECT * FROM adaptation_plans WHERE id = ?', [id]);
    if (plans.length === 0) {
      return errorResponse(res, '方案不存在', 404);
    }

    const plan = plans[0];

    if (req.user.role === 'adapter' && plan.adapter_id !== req.user.id) {
      return errorResponse(res, '权限不足', 403);
    }

    if (!['draft', 'modified', 'rejected'].includes(plan.status)) {
      return errorResponse(res, '当前状态的方案不能修改');
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
    if (devices !== undefined) {
      updateFields.push('devices = ?');
      updateParams.push(JSON.stringify(devices));
    }
    if (usage_instructions !== undefined) {
      updateFields.push('usage_instructions = ?');
      updateParams.push(usage_instructions);
    }
    if (precautions !== undefined) {
      updateFields.push('precautions = ?');
      updateParams.push(precautions);
    }
    if (estimated_effect !== undefined) {
      updateFields.push('estimated_effect = ?');
      updateParams.push(estimated_effect);
    }
    if (total_price !== undefined) {
      updateFields.push('total_price = ?');
      updateParams.push(total_price);
    }

    if (updateFields.length === 0) {
      return errorResponse(res, '没有需要更新的字段');
    }

    updateFields.push('status = ?');
    updateParams.push('modified');

    updateParams.push(id);

    await query(`UPDATE adaptation_plans SET ${updateFields.join(', ')} WHERE id = ?`, updateParams);

    const updatedPlans = await query('SELECT * FROM adaptation_plans WHERE id = ?', [id]);
    const updatedPlan = updatedPlans[0];
    updatedPlan.devices = parseJsonField(updatedPlan.devices, []);

    await createNotification(
      plan.user_id,
      'plan',
      '方案已更新',
      `适配师更新了方案：${updatedPlan.plan_name}`,
      'plan',
      id
    );

    successResponse(res, updatedPlan, '方案更新成功');
  } catch (error) {
    console.error('更新方案错误:', error);
    errorResponse(res, '更新方案失败', 500);
  }
}

async function updatePlanStatus(req, res) {
  try {
    const { id } = req.params;
    const { status, remark } = req.body;

    if (!['confirmed', 'rejected'].includes(status)) {
      return errorResponse(res, '无效的状态值');
    }

    const plans = await query('SELECT * FROM adaptation_plans WHERE id = ?', [id]);
    if (plans.length === 0) {
      return errorResponse(res, '方案不存在', 404);
    }

    const plan = plans[0];

    if (req.user.role === 'disabled' && plan.user_id !== req.user.id) {
      return errorResponse(res, '权限不足', 403);
    }

    if (!['draft', 'modified'].includes(plan.status)) {
      return errorResponse(res, '只有草稿或已修改状态的方案才能操作');
    }

    const updateData = status === 'confirmed' 
      ? { status, confirmed_at: new Date() }
      : { status };

    let updateSql = 'UPDATE adaptation_plans SET status = ?';
    const updateParams = [status];

    if (status === 'confirmed') {
      updateSql += ', confirmed_at = NOW()';
    }

    updateSql += ' WHERE id = ?';
    updateParams.push(id);

    await query(updateSql, updateParams);

    const statusText = status === 'confirmed' ? '已确认' : '已拒绝';
    const notificationTitle = status === 'confirmed' ? '方案已被确认' : '方案已被拒绝';
    const notificationContent = `用户${statusText}了方案：${plan.plan_name}`;

    await createNotification(
      plan.adapter_id,
      'plan',
      notificationTitle,
      notificationContent,
      'plan',
      id
    );

    const updatedPlans = await query('SELECT * FROM adaptation_plans WHERE id = ?', [id]);
    const updatedPlan = updatedPlans[0];
    updatedPlan.devices = parseJsonField(updatedPlan.devices, []);

    successResponse(res, updatedPlan, '状态更新成功');
  } catch (error) {
    console.error('更新方案状态错误:', error);
    errorResponse(res, '更新方案状态失败', 500);
  }
}

async function generateOrder(req, res) {
  const connection = await getConnection();
  try {
    await connection.beginTransaction();

    const { id } = req.params;
    const { delivery_address, contact_name, contact_phone, remark } = req.body;

    const [plansResult] = await connection.query('SELECT * FROM adaptation_plans WHERE id = ?', [id]);
    if (plansResult.length === 0) {
      await connection.rollback();
      return errorResponse(res, '方案不存在', 404);
    }

    const plan = plansResult[0];

    if (req.user.role === 'disabled' && plan.user_id !== req.user.id) {
      await connection.rollback();
      return errorResponse(res, '权限不足', 403);
    }

    if (req.user.role === 'adapter' && plan.adapter_id !== req.user.id) {
      await connection.rollback();
      return errorResponse(res, '权限不足', 403);
    }

    if (plan.status !== 'confirmed') {
      await connection.rollback();
      return errorResponse(res, '只有已确认的方案才能生成订单');
    }

    const [existingOrders] = await connection.query('SELECT id FROM orders WHERE plan_id = ? AND order_status NOT IN (?)', [id, ['cancelled', 'refunded']]);
    if (existingOrders.length > 0) {
      await connection.rollback();
      return errorResponse(res, '该方案已生成有效订单');
    }

    const orderNo = generateOrderNo();
    const devices = parseJsonField(plan.devices, []);
    const actualAmount = plan.total_price || 0;

    const [orderResult] = await connection.query(
      'INSERT INTO orders (order_no, plan_id, user_id, adapter_id, total_amount, discount_amount, actual_amount, order_status, payment_status, delivery_address, contact_name, contact_phone, remark, order_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURDATE())',
      [orderNo, id, plan.user_id, plan.adapter_id, plan.total_price || 0, 0, actualAmount, 'pending', 'unpaid', delivery_address || null, contact_name || null, contact_phone || null, remark || null]
    );

    const orderId = orderResult.insertId;

    if (devices && devices.length > 0) {
      const itemValues = devices.map(device => [
        orderId,
        device.device_id || device.id,
        device.device_name || device.name,
        device.quantity || 1,
        device.unit_price || device.price || 0,
        device.subtotal || (device.unit_price || device.price || 0) * (device.quantity || 1)
      ]);

      const placeholders = devices.map(() => '(?, ?, ?, ?, ?, ?)').join(', ');
      const itemParams = itemValues.flat();

      await connection.query(
        `INSERT INTO order_items (order_id, device_id, device_name, quantity, unit_price, subtotal) VALUES ${placeholders}`,
        itemParams
      );
    }

    await connection.commit();

    const [orders] = await connection.query('SELECT * FROM orders WHERE id = ?', [orderId]);
    const order = orders[0];

    await createNotification(
      plan.adapter_id,
      'order',
      '新订单已生成',
      `方案「${plan.plan_name}」已生成订单，请留意`,
      'order',
      orderId
    );

    successResponse(res, order, '订单生成成功');
  } catch (error) {
    await connection.rollback();
    console.error('生成订单错误:', error);
    errorResponse(res, '生成订单失败', 500);
  } finally {
    connection.release();
  }
}

module.exports = {
  createPlan,
  getPlans,
  getPlanDetail,
  updatePlan,
  updatePlanStatus,
  generateOrder
};
