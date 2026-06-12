const { query, getConnection } = require('../config/database');
const { successResponse, errorResponse, paginate } = require('../utils/helpers');
const { batchCreateNotifications } = require('../services/notification.service');
const dayjs = require('dayjs');

async function getMonthlyReports(req, res) {
  try {
    const { page = 1, pageSize = 10 } = req.query;
    const { limit, offset } = paginate(page, pageSize);

    const countResult = await query('SELECT COUNT(*) as total FROM monthly_reports');
    const total = countResult[0].total;

    const reports = await query(
      'SELECT * FROM monthly_reports ORDER BY report_month DESC LIMIT ? OFFSET ?',
      [limit, offset]
    );

    successResponse(res, {
      list: reports,
      total,
      page: parseInt(page),
      pageSize: parseInt(pageSize)
    }, '获取月度报表列表成功');
  } catch (error) {
    console.error('获取月度报表列表错误:', error);
    errorResponse(res, '获取月度报表列表失败', 500);
  }
}

async function getMonthlyReportDetail(req, res) {
  try {
    const { month } = req.params;

    const reports = await query('SELECT * FROM monthly_reports WHERE report_month = ?', [month]);

    if (reports.length === 0) {
      return errorResponse(res, '月度报表不存在', 404);
    }

    successResponse(res, reports[0], '获取月度报表详情成功');
  } catch (error) {
    console.error('获取月度报表详情错误:', error);
    errorResponse(res, '获取月度报表详情失败', 500);
  }
}

async function generateMonthlyReport(req, res) {
  const connection = await getConnection();
  try {
    await connection.beginTransaction();

    const { month } = req.body;

    const targetMonth = month || dayjs().subtract(1, 'month').format('YYYY-MM');
    const prevMonth = dayjs(targetMonth).subtract(1, 'month').format('YYYY-MM');

    const monthStart = dayjs(targetMonth).startOf('month').format('YYYY-MM-DD');
    const monthEnd = dayjs(targetMonth).endOf('month').format('YYYY-MM-DD');

    const prevMonthStart = dayjs(prevMonth).startOf('month').format('YYYY-MM-DD');
    const prevMonthEnd = dayjs(prevMonth).endOf('month').format('YYYY-MM-DD');

    const [orderStatsResult] = await connection.query(
      `SELECT 
        COUNT(*) as total_orders,
        COALESCE(SUM(actual_amount), 0) as order_revenue
       FROM orders 
       WHERE order_date >= ? AND order_date <= ?
       AND order_status NOT IN ('cancelled', 'refunded')`,
      [monthStart, monthEnd]
    );
    const orderStats = orderStatsResult[0];

    const [trainingStatsResult] = await connection.query(
      `SELECT 
        COUNT(*) as total_trainings,
        COALESCE(SUM(fee), 0) as training_revenue
       FROM training_records 
       WHERE training_date >= ? AND training_date <= ?`,
      [monthStart, monthEnd]
    );
    const trainingStats = trainingStatsResult[0];

    const totalRevenue = orderStats.order_revenue + trainingStats.training_revenue;

    const [prevOrderStatsResult] = await connection.query(
      `SELECT 
        COUNT(*) as total_orders,
        COALESCE(SUM(actual_amount), 0) as order_revenue
       FROM orders 
       WHERE order_date >= ? AND order_date <= ?
       AND order_status NOT IN ('cancelled', 'refunded')`,
      [prevMonthStart, prevMonthEnd]
    );
    const prevOrderStats = prevOrderStatsResult[0];

    const [prevTrainingStatsResult] = await connection.query(
      `SELECT 
        COUNT(*) as total_trainings,
        COALESCE(SUM(fee), 0) as training_revenue
       FROM training_records 
       WHERE training_date >= ? AND training_date <= ?`,
      [prevMonthStart, prevMonthEnd]
    );
    const prevTrainingStats = prevTrainingStatsResult[0];

    const prevTotalRevenue = prevOrderStats.order_revenue + prevTrainingStats.training_revenue;

    const calculateGrowthRate = (current, previous) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return parseFloat(((current - previous) / previous * 100).toFixed(2));
    };

    const comparisonData = {
      total_orders: {
        current: orderStats.total_orders,
        previous: prevOrderStats.total_orders,
        growth_rate: calculateGrowthRate(orderStats.total_orders, prevOrderStats.total_orders)
      },
      order_revenue: {
        current: orderStats.order_revenue,
        previous: prevOrderStats.order_revenue,
        growth_rate: calculateGrowthRate(orderStats.order_revenue, prevOrderStats.order_revenue)
      },
      total_trainings: {
        current: trainingStats.total_trainings,
        previous: prevTrainingStats.total_trainings,
        growth_rate: calculateGrowthRate(trainingStats.total_trainings, prevTrainingStats.total_trainings)
      },
      training_revenue: {
        current: trainingStats.training_revenue,
        previous: prevTrainingStats.training_revenue,
        growth_rate: calculateGrowthRate(trainingStats.training_revenue, prevTrainingStats.training_revenue)
      },
      total_revenue: {
        current: totalRevenue,
        previous: prevTotalRevenue,
        growth_rate: calculateGrowthRate(totalRevenue, prevTotalRevenue)
      }
    };

    const [existingReports] = await connection.query(
      'SELECT id FROM monthly_reports WHERE report_month = ?',
      [targetMonth]
    );

    let reportId;
    if (existingReports.length > 0) {
      reportId = existingReports[0].id;
      await connection.query(
        `UPDATE monthly_reports SET 
          total_orders = ?, order_revenue = ?, 
          total_trainings = ?, training_revenue = ?, 
          total_revenue = ?, comparison_data = ?, generated_at = NOW()
         WHERE id = ?`,
        [
          orderStats.total_orders,
          orderStats.order_revenue,
          trainingStats.total_trainings,
          trainingStats.training_revenue,
          totalRevenue,
          JSON.stringify(comparisonData),
          reportId
        ]
      );
    } else {
      const [result] = await connection.query(
        `INSERT INTO monthly_reports 
          (report_month, total_orders, order_revenue, total_trainings, training_revenue, total_revenue, comparison_data)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          targetMonth,
          orderStats.total_orders,
          orderStats.order_revenue,
          trainingStats.total_trainings,
          trainingStats.training_revenue,
          totalRevenue,
          JSON.stringify(comparisonData)
        ]
      );
      reportId = result.insertId;
    }

    const [adminUsers] = await connection.query(
      "SELECT id FROM users WHERE role = ? AND status = 1",
      ['admin']
    );

    if (adminUsers.length > 0) {
      const adminIds = adminUsers.map(u => u.id);
      const title = `${targetMonth}月度报表已生成`;
      const content = `订单数: ${orderStats.total_orders}笔，订单收入: ¥${orderStats.order_revenue}，训练次数: ${trainingStats.total_trainings}次，训练收入: ¥${trainingStats.training_revenue}，总收入: ¥${totalRevenue}`;
      await batchCreateNotifications(adminIds, 'report', title, content, 'monthly_report', reportId);
    }

    await connection.commit();

    const [finalReports] = await connection.query('SELECT * FROM monthly_reports WHERE id = ?', [reportId]);
    const report = finalReports[0];
    if (report.comparison_data) {
      report.comparison_data = JSON.parse(report.comparison_data);
    }

    successResponse(res, report, '生成月度报表成功');
  } catch (error) {
    await connection.rollback();
    console.error('生成月度报表错误:', error);
    errorResponse(res, '生成月度报表失败', 500);
  } finally {
    connection.release();
  }
}

async function getDashboardData(req, res) {
  try {
    const today = dayjs().format('YYYY-MM-DD');
    const monthStart = dayjs().startOf('month').format('YYYY-MM-DD');
    const monthEnd = dayjs().endOf('month').format('YYYY-MM-DD');

    const [todayOrdersResult] = await query(
      `SELECT 
        COUNT(*) as today_orders,
        COALESCE(SUM(actual_amount), 0) as today_order_revenue
       FROM orders 
       WHERE DATE(order_date) = ?
       AND order_status NOT IN ('cancelled', 'refunded')`,
      [today]
    );
    const todayOrders = todayOrdersResult[0];

    const [monthOrdersResult] = await query(
      `SELECT 
        COUNT(*) as month_orders,
        COALESCE(SUM(actual_amount), 0) as month_order_revenue
       FROM orders 
       WHERE order_date >= ? AND order_date <= ?
       AND order_status NOT IN ('cancelled', 'refunded')`,
      [monthStart, monthEnd]
    );
    const monthOrders = monthOrdersResult[0];

    const [monthTrainingsResult] = await query(
      `SELECT 
        COUNT(*) as month_trainings,
        COALESCE(SUM(fee), 0) as month_training_revenue
       FROM training_records 
       WHERE training_date >= ? AND training_date <= ?`,
      [monthStart, monthEnd]
    );
    const monthTrainings = monthTrainingsResult[0];

    const userStatsResult = await query(
      `SELECT 
        SUM(CASE WHEN role = 'disabled' THEN 1 ELSE 0 END) as disabled_count,
        SUM(CASE WHEN role = 'adapter' THEN 1 ELSE 0 END) as adapter_count,
        SUM(CASE WHEN role = 'therapist' THEN 1 ELSE 0 END) as therapist_count,
        COUNT(*) as total_users
       FROM users 
       WHERE status = 1`
    );
    const userStats = userStatsResult[0];

    const [recentOrdersResult] = await query(
      `SELECT o.*, u.real_name as user_name, a.real_name as adapter_name 
       FROM orders o 
       LEFT JOIN users u ON o.user_id = u.id 
       LEFT JOIN users a ON o.adapter_id = a.id 
       ORDER BY o.created_at DESC 
       LIMIT 5`
    );
    const recentOrders = recentOrdersResult;

    const [recentTrainingsResult] = await query(
      `SELECT tr.*, tp.plan_name, u.real_name as user_name 
       FROM training_records tr 
       LEFT JOIN training_plans tp ON tr.plan_id = tp.id 
       LEFT JOIN users u ON tr.user_id = u.id 
       ORDER BY tr.created_at DESC 
       LIMIT 5`
    );
    const recentTrainings = recentTrainingsResult;

    let lastMonthReport = null;
    const lastMonth = dayjs().subtract(1, 'month').format('YYYY-MM');
    const [lastMonthReports] = await query(
      'SELECT * FROM monthly_reports WHERE report_month = ?',
      [lastMonth]
    );
    if (lastMonthReports.length > 0) {
      lastMonthReport = lastMonthReports[0];
      if (lastMonthReport.comparison_data) {
        lastMonthReport.comparison_data = JSON.parse(lastMonthReport.comparison_data);
      }
    }

    successResponse(res, {
      today: {
        orders: todayOrders.today_orders,
        order_revenue: todayOrders.today_order_revenue
      },
      this_month: {
        orders: monthOrders.month_orders,
        order_revenue: monthOrders.month_order_revenue,
        trainings: monthTrainings.month_trainings,
        training_revenue: monthTrainings.month_training_revenue,
        total_revenue: monthOrders.month_order_revenue + monthTrainings.month_training_revenue
      },
      users: {
        total: userStats.total_users,
        disabled: userStats.disabled_count,
        adapter: userStats.adapter_count,
        therapist: userStats.therapist_count
      },
      recent_orders: recentOrders,
      recent_trainings: recentTrainings,
      last_month_report: lastMonthReport
    }, '获取仪表盘数据成功');
  } catch (error) {
    console.error('获取仪表盘数据错误:', error);
    errorResponse(res, '获取仪表盘数据失败', 500);
  }
}

module.exports = {
  getMonthlyReports,
  getMonthlyReportDetail,
  generateMonthlyReport,
  getDashboardData
};
