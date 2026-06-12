const { query } = require('../config/database');
const { successResponse, errorResponse, paginate, parseJsonField } = require('../utils/helpers');

async function getDevices(req, res) {
  try {
    const { category, disability_type, keyword, page = 1, pageSize = 10 } = req.query;
    const { limit, offset } = paginate(page, pageSize);

    let sql = 'SELECT * FROM assistive_devices WHERE 1=1';
    const params = [];

    if (category) {
      sql += ' AND category = ?';
      params.push(category);
    }

    if (disability_type) {
      sql += ' AND disability_type LIKE ?';
      params.push(`%${disability_type}%`);
    }

    if (keyword) {
      sql += ' AND (name LIKE ? OR description LIKE ?)';
      params.push(`%${keyword}%`, `%${keyword}%`);
    }

    sql += ' ORDER BY id DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const devices = await query(sql, params);

    const devicesWithJson = devices.map(device => ({
      ...device,
      features: parseJsonField(device.features, []),
      specifications: parseJsonField(device.specifications, {}),
      images: parseJsonField(device.images, [])
    }));

    let countSql = 'SELECT COUNT(*) as total FROM assistive_devices WHERE 1=1';
    const countParams = [];

    if (category) {
      countSql += ' AND category = ?';
      countParams.push(category);
    }

    if (disability_type) {
      countSql += ' AND disability_type LIKE ?';
      countParams.push(`%${disability_type}%`);
    }

    if (keyword) {
      countSql += ' AND (name LIKE ? OR description LIKE ?)';
      countParams.push(`%${keyword}%`, `%${keyword}%`);
    }

    const countResult = await query(countSql, countParams);
    const total = countResult[0].total;

    successResponse(res, {
      list: devicesWithJson,
      pagination: {
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        total,
        totalPages: Math.ceil(total / pageSize)
      }
    });
  } catch (error) {
    console.error('获取器具列表错误:', error);
    errorResponse(res, '获取器具列表失败', 500);
  }
}

async function getDeviceById(req, res) {
  try {
    const { id } = req.params;
    const devices = await query('SELECT * FROM assistive_devices WHERE id = ?', [id]);

    if (devices.length === 0) {
      return errorResponse(res, '器具不存在', 404);
    }

    const device = {
      ...devices[0],
      features: parseJsonField(devices[0].features, []),
      specifications: parseJsonField(devices[0].specifications, {}),
      images: parseJsonField(devices[0].images, [])
    };

    successResponse(res, device);
  } catch (error) {
    console.error('获取器具详情错误:', error);
    errorResponse(res, '获取器具详情失败', 500);
  }
}

async function createDevice(req, res) {
  try {
    const {
      name,
      category,
      disability_type,
      description,
      features,
      specifications,
      price,
      stock,
      images,
      brand,
      model
    } = req.body;

    if (!name || !category || !disability_type) {
      return errorResponse(res, '名称、分类和适用残疾类型不能为空', 400);
    }

    const featuresJson = features ? JSON.stringify(features) : null;
    const specificationsJson = specifications ? JSON.stringify(specifications) : null;
    const imagesJson = images ? JSON.stringify(images) : null;

    const result = await query(
      `INSERT INTO assistive_devices 
       (name, category, disability_type, description, features, specifications, price, stock, images, brand, model, status) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [name, category, disability_type, description, featuresJson, specificationsJson, price, stock, imagesJson, brand, model]
    );

    successResponse(res, { id: result.insertId }, '新增器具成功');
  } catch (error) {
    console.error('新增器具错误:', error);
    errorResponse(res, '新增器具失败', 500);
  }
}

async function updateDevice(req, res) {
  try {
    const { id } = req.params;
    const {
      name,
      category,
      disability_type,
      description,
      features,
      specifications,
      price,
      stock,
      images,
      brand,
      model,
      status
    } = req.body;

    const existing = await query('SELECT id FROM assistive_devices WHERE id = ?', [id]);
    if (existing.length === 0) {
      return errorResponse(res, '器具不存在', 404);
    }

    const fields = [];
    const params = [];

    if (name !== undefined) {
      fields.push('name = ?');
      params.push(name);
    }
    if (category !== undefined) {
      fields.push('category = ?');
      params.push(category);
    }
    if (disability_type !== undefined) {
      fields.push('disability_type = ?');
      params.push(disability_type);
    }
    if (description !== undefined) {
      fields.push('description = ?');
      params.push(description);
    }
    if (features !== undefined) {
      fields.push('features = ?');
      params.push(JSON.stringify(features));
    }
    if (specifications !== undefined) {
      fields.push('specifications = ?');
      params.push(JSON.stringify(specifications));
    }
    if (price !== undefined) {
      fields.push('price = ?');
      params.push(price);
    }
    if (stock !== undefined) {
      fields.push('stock = ?');
      params.push(stock);
    }
    if (images !== undefined) {
      fields.push('images = ?');
      params.push(JSON.stringify(images));
    }
    if (brand !== undefined) {
      fields.push('brand = ?');
      params.push(brand);
    }
    if (model !== undefined) {
      fields.push('model = ?');
      params.push(model);
    }
    if (status !== undefined) {
      fields.push('status = ?');
      params.push(status);
    }

    if (fields.length === 0) {
      return errorResponse(res, '没有要更新的内容', 400);
    }

    params.push(id);

    await query(`UPDATE assistive_devices SET ${fields.join(', ')} WHERE id = ?`, params);

    successResponse(res, null, '更新器具成功');
  } catch (error) {
    console.error('更新器具错误:', error);
    errorResponse(res, '更新器具失败', 500);
  }
}

async function deleteDevice(req, res) {
  try {
    const { id } = req.params;

    const existing = await query('SELECT id FROM assistive_devices WHERE id = ?', [id]);
    if (existing.length === 0) {
      return errorResponse(res, '器具不存在', 404);
    }

    await query('DELETE FROM assistive_devices WHERE id = ?', [id]);

    successResponse(res, null, '删除器具成功');
  } catch (error) {
    console.error('删除器具错误:', error);
    errorResponse(res, '删除器具失败', 500);
  }
}

async function getDeviceCategories(req, res) {
  try {
    const rows = await query(
      'SELECT DISTINCT category FROM assistive_devices WHERE category IS NOT NULL AND category != "" ORDER BY category'
    );

    const categories = rows.map(row => row.category);

    successResponse(res, categories);
  } catch (error) {
    console.error('获取器具分类错误:', error);
    errorResponse(res, '获取器具分类失败', 500);
  }
}

module.exports = {
  getDevices,
  getDeviceById,
  createDevice,
  updateDevice,
  deleteDevice,
  getDeviceCategories
};
