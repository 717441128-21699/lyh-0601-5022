const cron = require('node-cron');
const dayjs = require('dayjs');
const { getConnection } = require('../config/database');
const { batchCreateNotifications } = require('./notification.service');

async function generateMonthlyReportData(targetMonth) {
  const connection = await getConnection();
  try {
    await connection.beginTransaction();

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

    return {
      reportId,
      reportMonth: targetMonth,
      total_orders: orderStats.total_orders,
      order_revenue: orderStats.order_revenue,
      total_trainings: trainingStats.total_trainings,
      training_revenue: trainingStats.training_revenue,
      total_revenue: totalRevenue,
      comparison_data: comparisonData
    };
  } catch (error) {
    await connection.rollback();
    console.error('生成月度报表错误:', error);
    throw error;
  } finally {
    connection.release();
  }
}

async function generateLastMonthReport() {
  const lastMonth = dayjs().subtract(1, 'month').format('YYYY-MM');
  console.log(`[Cron] 开始生成 ${lastMonth} 月度报表...`);
  try {
    const result = await generateMonthlyReportData(lastMonth);
    console.log(`[Cron] ${lastMonth} 月度报表生成成功，报表ID: ${result.reportId}`);
    return result;
  } catch (error) {
    console.error(`[Cron] ${lastMonth} 月度报表生成失败:`, error);
    throw error;
  }
}

function startCronJobs() {
  console.log('⏰ 定时任务服务启动中...');

  cron.schedule('0 2 1 * *', async () => {
    console.log('[Cron] 触发月度报表生成任务');
    try {
      await generateLastMonthReport();
    } catch (error) {
      console.error('[Cron] 月度报表生成任务执行失败:', error);
    }
  }, {
    timezone: 'Asia/Shanghai'
  });

  console.log('✅ 定时任务已启动');
  console.log('   - 每月1号凌晨2点自动生成上月运营报表');
}

module.exports = {
  startCronJobs,
  generateMonthlyReportData,
  generateLastMonthReport
};
