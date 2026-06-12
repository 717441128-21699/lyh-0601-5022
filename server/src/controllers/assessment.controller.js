const { query } = require('../config/database');
const { successResponse, errorResponse, paginate, parseJsonField } = require('../utils/helpers');
const { createNotification, batchCreateNotifications } = require('../services/notification.service');

function calculateMatchScore(device, disabilityType, bodyData, dailyNeeds) {
  let score = 0;
  const details = [];

  const deviceDisabilityTypes = device.disability_types ? device.disability_types.split(',').map(t => t.trim()) : [];
  
  if (deviceDisabilityTypes.includes(disabilityType)) {
    score += 40;
    details.push({ factor: '残疾类型匹配', score: 40 });
  } else {
    const partialMatch = deviceDisabilityTypes.some(t => 
      disabilityType.includes(t) || t.includes(disabilityType)
    );
    if (partialMatch) {
      score += 20;
      details.push({ factor: '残疾类型部分匹配', score: 20 });
    }
  }

  const needsText = typeof dailyNeeds === 'string' ? dailyNeeds : (dailyNeeds || '');
  const deviceText = `${device.name} ${device.description || ''} ${device.category || ''} ${device.suitable_conditions || ''}`;
  const lowerDeviceText = deviceText.toLowerCase();
  const lowerNeedsText = needsText.toLowerCase();

  const keywords = lowerNeedsText.split(/[\s,，、。.]+/).filter(k => k.length >= 2);
  let keywordMatches = 0;

  for (const keyword of keywords) {
    if (lowerDeviceText.includes(keyword)) {
      keywordMatches++;
    }
  }

  if (keywordMatches > 0) {
    const keywordScore = Math.min(keywordMatches * 8, 30);
    score += keywordScore;
    details.push({ factor: `需求关键词匹配(${keywordMatches}个)`, score: keywordScore });
  }

  if (bodyData && typeof bodyData === 'object') {
    const specs = parseJsonField(device.specifications, {});
    let bodyMatchScore = 0;

    const specsStr = JSON.stringify(specs).toLowerCase();
    if (bodyData.height && specsStr.includes('承重')) {
      bodyMatchScore += 5;
    }
    if (bodyData.weight && specsStr.includes('重量')) {
      bodyMatchScore += 5;
    }

    if (bodyMatchScore > 0) {
      score += bodyMatchScore;
      details.push({ factor: '身体数据适配', score: bodyMatchScore });
    }
  }

  if (device.status === 1) {
    score += 5;
    details.push({ factor: '设备状态正常', score: 5 });
  }

  return {
    score: Math.min(score, 100),
    details,
    device: {
      id: device.id,
      name: device.name,
      category: device.category,
      sub_category: device.sub_category,
      disability_types: device.disability_types,
      description: device.description,
      price: device.price,
      image_url: device.image_url,
      brand: device.brand,
      specifications: parseJsonField(device.specifications, {}),
      suitable_conditions: device.suitable_conditions,
      contraindications: device.contraindications
    }
  };
}

async function generateRecommendations(disabilityType, bodyData, dailyNeeds) {
  const devices = await query('SELECT * FROM assistive_devices WHERE status = 1', []);

  const scoredDevices = devices.map(device => 
    calculateMatchScore(device, disabilityType, bodyData, dailyNeeds)
  );

  scoredDevices.sort((a, b) => b.score - a.score);

  const topRecommendations = scoredDevices.slice(0, 10);

  return {
    total_matches: scoredDevices.length,
    recommendations: topRecommendations,
    generated_at: new Date().toISOString()
  };
}

async function createAssessment(req, res) {
  try {
    const userId = req.user.id;
    const {
      disability_type,
      disability_level,
      body_data,
      daily_needs,
      living_environment,
      medical_history
    } = req.body;

    if (!disability_type) {
      return errorResponse(res, '残疾类型不能为空', 400);
    }

    const bodyDataJson = body_data ? JSON.stringify(body_data) : null;

    const recommendationResult = await generateRecommendations(
      disability_type,
      body_data,
      daily_needs
    );
    const recommendationJson = JSON.stringify(recommendationResult);

    const result = await query(
      `INSERT INTO assessments 
       (user_id, disability_type, disability_level, body_data, daily_needs, living_environment, medical_history, recommendation_result, status, assessment_type) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'processing', 'online')`,
      [userId, disability_type, disability_level, bodyDataJson, daily_needs, living_environment, medical_history, recommendationJson]
    );

    const adapters = await query(
      "SELECT id FROM users WHERE role = 'admin' OR role = 'adapter'",
      []
    );

    if (adapters.length > 0) {
      const adapterIds = adapters.map(a => a.id);
      batchCreateNotifications(
        adapterIds,
        'assessment',
        '新的评估申请',
        '有新的在线评估申请待处理',
        'assessment',
        result.insertId
      );
    }

    successResponse(res, { 
      id: result.insertId,
      recommendation: recommendationResult
    }, '评估提交成功');
  } catch (error) {
    console.error('提交评估错误:', error);
    errorResponse(res, '提交评估失败', 500);
  }
}

async function getAssessments(req, res) {
  try {
    const { page = 1, pageSize = 10, status, assessment_type, keyword } = req.query;
    const { limit, offset } = paginate(page, pageSize);

    let sql = `SELECT a.*, u.real_name as user_name, u.phone as user_phone, ad.real_name as adapter_name
               FROM assessments a 
               LEFT JOIN users u ON a.user_id = u.id 
               LEFT JOIN users ad ON a.adapter_id = ad.id 
               WHERE 1=1`;
    const params = [];

    if (req.user.role === 'disabled') {
      sql += ' AND a.user_id = ?';
      params.push(req.user.id);
    } else if (req.user.role === 'adapter') {
      sql += ' AND (a.adapter_id = ? OR a.adapter_id IS NULL)';
      params.push(req.user.id);
    }

    if (status) {
      sql += ' AND a.status = ?';
      params.push(status);
    }

    if (assessment_type) {
      sql += ' AND a.assessment_type = ?';
      params.push(assessment_type);
    }

    if (keyword) {
      sql += ' AND (u.real_name LIKE ? OR a.disability_type LIKE ?)';
      params.push(`%${keyword}%`, `%${keyword}%`);
    }

    sql += ' ORDER BY a.id DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const assessments = await query(sql, params);

    const assessmentsWithJson = assessments.map(a => ({
      ...a,
      body_data: parseJsonField(a.body_data, {}),
      recommendation_result: parseJsonField(a.recommendation_result, null)
    }));

    let countSql = 'SELECT COUNT(*) as total FROM assessments a LEFT JOIN users u ON a.user_id = u.id WHERE 1=1';
    const countParams = [];

    if (req.user.role === 'disabled') {
      countSql += ' AND a.user_id = ?';
      countParams.push(req.user.id);
    } else if (req.user.role === 'adapter') {
      countSql += ' AND (a.adapter_id = ? OR a.adapter_id IS NULL)';
      countParams.push(req.user.id);
    }

    if (status) {
      countSql += ' AND a.status = ?';
      countParams.push(status);
    }

    if (keyword) {
      countSql += ' AND (u.real_name LIKE ? OR a.disability_type LIKE ?)';
      countParams.push(`%${keyword}%`, `%${keyword}%`);
    }

    const countResult = await query(countSql, countParams);
    const total = countResult[0].total;

    successResponse(res, {
      list: assessmentsWithJson,
      pagination: {
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        total,
        totalPages: Math.ceil(total / pageSize)
      }
    });
  } catch (error) {
    console.error('获取评估列表错误:', error);
    errorResponse(res, '获取评估列表失败', 500);
  }
}

async function getAssessmentById(req, res) {
  try {
    const { id } = req.params;
    const assessments = await query(
      `SELECT a.*, u.real_name as user_name, u.phone as user_phone, u.email as user_email,
              ad.real_name as adapter_name, ad.phone as adapter_phone
       FROM assessments a 
       LEFT JOIN users u ON a.user_id = u.id 
       LEFT JOIN users ad ON a.adapter_id = ad.id 
       WHERE a.id = ?`,
      [id]
    );

    if (assessments.length === 0) {
      return errorResponse(res, '评估不存在', 404);
    }

    if (req.user.role === 'disabled' && assessments[0].user_id !== req.user.id) {
      return errorResponse(res, '权限不足', 403);
    }

    const assessment = {
      ...assessments[0],
      body_data: parseJsonField(assessments[0].body_data, {}),
      recommendation_result: parseJsonField(assessments[0].recommendation_result, null)
    };

    successResponse(res, assessment);
  } catch (error) {
    console.error('获取评估详情错误:', error);
    errorResponse(res, '获取评估详情失败', 500);
  }
}

async function updateAssessment(req, res) {
  try {
    const { id } = req.params;
    const {
      disability_type,
      disability_level,
      body_data,
      daily_needs,
      living_environment,
      medical_history,
      evaluation_details,
      status,
      adapter_id
    } = req.body;

    const existing = await query('SELECT * FROM assessments WHERE id = ?', [id]);
    if (existing.length === 0) {
      return errorResponse(res, '评估不存在', 404);
    }

    if (req.user.role === 'disabled' && existing[0].user_id !== req.user.id) {
      return errorResponse(res, '权限不足', 403);
    }

    if (req.user.role === 'adapter' && existing[0].adapter_id && existing[0].adapter_id !== req.user.id) {
      return errorResponse(res, '权限不足', 403);
    }

    const fields = [];
    const params = [];

    if (disability_type !== undefined) {
      fields.push('disability_type = ?');
      params.push(disability_type);
    }
    if (disability_level !== undefined) {
      fields.push('disability_level = ?');
      params.push(disability_level);
    }
    if (body_data !== undefined) {
      fields.push('body_data = ?');
      params.push(JSON.stringify(body_data));
    }
    if (daily_needs !== undefined) {
      fields.push('daily_needs = ?');
      params.push(daily_needs);
    }
    if (living_environment !== undefined) {
      fields.push('living_environment = ?');
      params.push(living_environment);
    }
    if (medical_history !== undefined) {
      fields.push('medical_history = ?');
      params.push(medical_history);
    }
    if (evaluation_details !== undefined) {
      fields.push('evaluation_details = ?');
      params.push(evaluation_details);
    }
    if (status !== undefined) {
      fields.push('status = ?');
      params.push(status);
    }
    if (adapter_id !== undefined) {
      fields.push('adapter_id = ?');
      params.push(adapter_id);
    }

    if (fields.length === 0) {
      return errorResponse(res, '没有要更新的内容', 400);
    }

    let needsRecompute = disability_type !== undefined || 
                         body_data !== undefined || 
                         daily_needs !== undefined;

    if (needsRecompute) {
      const currentDisabilityType = disability_type || existing[0].disability_type;
      const currentBodyData = body_data || parseJsonField(existing[0].body_data, {});
      const currentDailyNeeds = daily_needs || existing[0].daily_needs;

      const recommendationResult = await generateRecommendations(
        currentDisabilityType,
        currentBodyData,
        currentDailyNeeds
      );

      fields.push('recommendation_result = ?');
      params.push(JSON.stringify(recommendationResult));
    }

    params.push(id);

    await query(`UPDATE assessments SET ${fields.join(', ')} WHERE id = ?`, params);

    if (status && status !== existing[0].status) {
      createNotification(
        existing[0].user_id,
        'assessment',
        '评估状态更新',
        `您的评估状态已更新为: ${status}`,
        'assessment',
        id
      );
    }

    successResponse(res, null, '更新评估成功');
  } catch (error) {
    console.error('更新评估错误:', error);
    errorResponse(res, '更新评估失败', 500);
  }
}

async function addHomeAssessment(req, res) {
  try {
    const { id } = req.params;
    const adapterId = req.user.id;
    const {
      disability_type,
      disability_level,
      body_data,
      daily_needs,
      living_environment,
      medical_history,
      evaluation_details
    } = req.body;

    const existing = await query('SELECT * FROM assessments WHERE id = ?', [id]);
    if (existing.length === 0) {
      return errorResponse(res, '评估不存在', 404);
    }

    const recommendationResult = await generateRecommendations(
      disability_type || existing[0].disability_type,
      body_data || parseJsonField(existing[0].body_data, {}),
      daily_needs || existing[0].daily_needs
    );

    await query(
      `UPDATE assessments SET 
        adapter_id = ?, 
        assessment_type = 'home',
        disability_type = ?,
        disability_level = ?,
        body_data = ?,
        daily_needs = ?,
        living_environment = ?,
        medical_history = ?,
        evaluation_details = ?,
        recommendation_result = ?,
        status = 'completed',
        assessment_time = NOW()
       WHERE id = ?`,
      [
        adapterId,
        disability_type || existing[0].disability_type,
        disability_level || existing[0].disability_level,
        body_data ? JSON.stringify(body_data) : existing[0].body_data,
        daily_needs || existing[0].daily_needs,
        living_environment || existing[0].living_environment,
        medical_history || existing[0].medical_history,
        evaluation_details,
        JSON.stringify(recommendationResult),
        id
      ]
    );

    createNotification(
      existing[0].user_id,
      'assessment',
      '上门评估完成',
      '您的上门评估已完成，请查看评估结果和推荐方案',
      'assessment',
      id
    );

    successResponse(res, { recommendation: recommendationResult }, '上门评估录入成功');
  } catch (error) {
    console.error('上门评估录入错误:', error);
    errorResponse(res, '上门评估录入失败', 500);
  }
}

async function getRecommendation(req, res) {
  try {
    const { id } = req.params;

    const assessments = await query('SELECT * FROM assessments WHERE id = ?', [id]);
    if (assessments.length === 0) {
      return errorResponse(res, '评估不存在', 404);
    }

    if (req.user.role === 'disabled' && assessments[0].user_id !== req.user.id) {
      return errorResponse(res, '权限不足', 403);
    }

    const assessment = assessments[0];
    let recommendationResult = parseJsonField(assessment.recommendation_result, null);

    if (!recommendationResult || !recommendationResult.recommendations) {
      recommendationResult = await generateRecommendations(
        assessment.disability_type,
        parseJsonField(assessment.body_data, {}),
        assessment.daily_needs
      );

      await query(
        'UPDATE assessments SET recommendation_result = ? WHERE id = ?',
        [JSON.stringify(recommendationResult), id]
      );
    }

    successResponse(res, recommendationResult);
  } catch (error) {
    console.error('获取推荐结果错误:', error);
    errorResponse(res, '获取推荐结果失败', 500);
  }
}

module.exports = {
  createAssessment,
  getAssessments,
  getAssessmentById,
  updateAssessment,
  addHomeAssessment,
  getRecommendation
};
