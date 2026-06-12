const { query, getConnection } = require('../config/database');
const { successResponse, errorResponse, paginate, generateOrderNo } = require('../utils/helpers');

async function getFinanceRecords(req, res) {
  try {
    const { page = 1, pageSize = 10, type, start_date, end_date, keyword } = req.query;
    const { limit, offset } = paginate(page, pageSize);

    let sql = 'SELECT * FROM financial_records WHERE 1=1';
    const params = [];

    if (type) {
      sql += ' AND type = ?';
      params.push(type);
    }

    if (start_date) {
      sql += ' AND record_date >= ?';
      params.push(start_date);
    }

    if (end_date) {
      sql += ' AND record_date <= ?';
      params.push(end_date);
    }

    if (keyword) {
      sql += ' AND (description LIKE ? OR record_no LIKE ?)';
      params.push(`%${keyword}%`, `%${keyword}%`);
    }

    const countSql = sql.replace('SELECT *', 'SELECT COUNT(*) as total');
    const countResult = await query(countSql, params);
    const total = countResult[0].total;

    sql += ' ORDER BY record_date DESC, id DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const records = await query(sql, params);

    successResponse(res, {
      list: records,
      total,
      page: parseInt(page),
      pageSize: parseInt(pageSize)
    }, '获取财务记录列表成功');
  } catch (error) {
    console.error('获取财务记录列表错误:', error);
    errorResponse(res, '获取财务记录列表失败', 500);
  }
}

async function getFinanceRecordDetail(req, res) {
  try {
    const { id } = req.params;

    const records = await query('SELECT * FROM financial_records WHERE id = ?', [id]);

    if (records.length === 0) {
      return errorResponse(res, '财务记录不存在', 404);
    }

    successResponse(res, records[0], '获取财务记录详情成功');
  } catch (error) {
    console.error('获取财务记录详情错误:', error);
    errorResponse(res, '获取财务记录详情失败', 500);
  }
}

async function addFinanceRecord(req, res) {
  const connection = await getConnection();
  try {
    await connection.beginTransaction();

    const { type, amount, record_date, description, category, related_type, related_id, operator } = req.body;

    if (!type || !amount || !record_date) {
      await connection.rollback();
      return errorResponse(res, '请填写必填项');
    }

    const validTypes = ['income', 'expense'];
    if (!validTypes.includes(type)) {
      await connection.rollback();
      return errorResponse(res, '无效的类型');
    }

    const recordNo = generateOrderNo().replace('ORD', 'FIN');

    const result = await connection.query(
      'INSERT INTO financial_records (record_no, type, amount, record_date, description, category, related_type, related_id, operator) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [recordNo, type, amount, record_date, description || null, category || null, related_type || null, related_id || null, operator || null]
    );

    await connection.commit();

    const [newRecords] = await connection.query('SELECT * FROM financial_records WHERE id = ?', [result[0].insertId]);
    successResponse(res, newRecords[0], '添加财务记录成功');
  } catch (error) {
    await connection.rollback();
    console.error('添加财务记录错误:', error);
    errorResponse(res, '添加财务记录失败', 500);
  } finally {
    connection.release();
  }
}

async function getFinanceSummary(req, res) {
  try {
    const { start_date, end_date } = req.query;

    let incomeSql = 'SELECT COALESCE(SUM(amount), 0) as total_income FROM financial_records WHERE type = ?';
    let expenseSql = 'SELECT COALESCE(SUM(amount), 0) as total_expense FROM financial_records WHERE type = ?';
    const incomeParams = ['income'];
    const expenseParams = ['expense'];

    if (start_date) {
      incomeSql += ' AND record_date >= ?';
      expenseSql += ' AND record_date >= ?';
      incomeParams.push(start_date);
      expenseParams.push(start_date);
    }

    if (end_date) {
      incomeSql += ' AND record_date <= ?';
      expenseSql += ' AND record_date <= ?';
      incomeParams.push(end_date);
      expenseParams.push(end_date);
    }

    const incomeResult = await query(incomeSql, incomeParams);
    const expenseResult = await query(expenseSql, expenseParams);

    const totalIncome = incomeResult[0].total_income;
    const totalExpense = expenseResult[0].total_expense;
    const netProfit = totalIncome - totalExpense;

    const countSql = 'SELECT COUNT(*) as total_count FROM financial_records WHERE 1=1';
    const countParams = [];

    if (start_date) {
      countSql +=' AND record_date >= ?';
      countParams.push(start_date);
    }

    if (end_date) {
      countSql += ' AND record_date <= ?';
      countParams.push(end_date);
    }

    const countResult = await query(countSql, countParams);

    successResponse(res, {
      total_income: totalIncome,
      total_expense: totalExpense,
      net_profit: netProfit,
      total_count: countResult[0].total_count
    }, '获取财务汇总成功');
  } catch (error) {
    console.error('获取财务汇总错误:', error);
    errorResponse(res, '获取财务汇总失败', 500);
  }
}

async function getFinanceStatistics(req, res) {
  try {
    const { start_date, end_date, group_by = 'month' } = req.query;

    let dateFormat;
    if (group_by === 'month') {
      dateFormat = '%Y-%m';
    } else if (group_by === 'day') {
      dateFormat = '%Y-%m-%d';
    } else if (group_by === 'type') {
      dateFormat = null;
    } else {
      dateFormat = '%Y-%m';
    }

    if (group_by === 'type') {
      let sql = 'SELECT type, category, COUNT(*) as count, COALESCE(SUM(amount), 0) as total FROM financial_records WHERE 1=1';
      const params = [];

      if (start_date) {
        sql += ' AND record_date >= ?';
        params.push(start_date);
      }

      if (end_date) {
        sql += ' AND record_date <= ?';
        params.push(end_date);
      }

      sql += ' GROUP BY type, category ORDER BY type, total DESC';

      const stats = await query(sql, params);

      const incomeStats = stats.filter(s => s.type === 'income');
      const expenseStats = stats.filter(s => s.type === 'expense');

      successResponse(res, {
        group_by: 'type',
        income: incomeStats,
        expense: expenseStats
      }, '获取财务统计成功');
    } else {
      let sql = `SELECT DATE_FORMAT(record_date, ?) as period, type, COALESCE(SUM(amount), 0) as total, COUNT(*) as count FROM financial_records WHERE 1=1`;
      const params = [dateFormat];

      if (start_date) {
        sql += ' AND record_date >= ?';
        params.push(start_date);
      }

      if (end_date) {
        sql += ' AND record_date <= ?';
        params.push(end_date);
      }

      sql += ' GROUP BY period, type ORDER BY period DESC, type';

      const stats = await query(sql, params);

      const periodMap = {};
      for (const stat of stats) {
        if (!periodMap[stat.period]) {
          periodMap[stat.period] = { period: stat.period, income: 0, expense: 0, income_count: 0, expense_count: 0 };
        }
        if (stat.type === 'income') {
          periodMap[stat.period].income = stat.total;
          periodMap[stat.period].income_count = stat.count;
        } else if (stat.type === 'expense') {
          periodMap[stat.period].expense = stat.total;
          periodMap[stat.period].expense_count = stat.count;
        }
      }

      const result = Object.values(periodMap).map(item => ({
        ...item,
        net_profit: item.income - item.expense
      }));

      successResponse(res, {
        group_by,
        list: result
      }, '获取财务统计成功');
    }
  } catch (error) {
    console.error('获取财务统计错误:', error);
    errorResponse(res, '获取财务统计失败', 500);
  }
}

module.exports = {
  getFinanceRecords,
  getFinanceRecordDetail,
  addFinanceRecord,
  getFinanceSummary,
  getFinanceStatistics
};
