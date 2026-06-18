const pool = require('../db/pool')

const getDashboardStats = async (req, res) => {
  try {
    const [totalRes, activeRes, monthRes, revenueRes] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM members'),
      pool.query("SELECT COUNT(*) FROM members WHERE status = 'active'"),
      pool.query(
        "SELECT COUNT(*) FROM members WHERE DATE_TRUNC('month', registered_at) = DATE_TRUNC('month', CURRENT_DATE)"
      ),
      pool.query(`
        SELECT COALESCE(SUM(
          CASE plan
            WHEN 'basic' THEN CASE duration WHEN '1' THEN 150000 WHEN '3' THEN 420000 WHEN '6' THEN 780000 WHEN '12' THEN 1440000 END
            WHEN 'regular' THEN CASE duration WHEN '1' THEN 250000 WHEN '3' THEN 690000 WHEN '6' THEN 1260000 WHEN '12' THEN 2280000 END
            WHEN 'premium' THEN CASE duration WHEN '1' THEN 450000 WHEN '3' THEN 1260000 WHEN '6' THEN 2340000 WHEN '12' THEN 4320000 END
          END
        ), 0) as revenue
        FROM members
        WHERE DATE_TRUNC('month', registered_at) = DATE_TRUNC('month', CURRENT_DATE)
      `),
    ])

    res.json({
      success: true,
      data: {
        totalMembers: parseInt(totalRes.rows[0].count),
        activeMembers: parseInt(activeRes.rows[0].count),
        thisMonthRegistrations: parseInt(monthRes.rows[0].count),
        monthlyRevenue: parseInt(revenueRes.rows[0].revenue),
      }
    })
  } catch (err) {
    console.error('getDashboardStats error:', err)
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

const getChartData = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        TO_CHAR(DATE_TRUNC('month', registered_at), 'Mon') as month,
        DATE_TRUNC('month', registered_at) as month_date,
        COUNT(*) as registrations,
        COALESCE(SUM(
          CASE plan
            WHEN 'basic' THEN CASE duration WHEN '1' THEN 150000 WHEN '3' THEN 420000 WHEN '6' THEN 780000 WHEN '12' THEN 1440000 END
            WHEN 'regular' THEN CASE duration WHEN '1' THEN 250000 WHEN '3' THEN 690000 WHEN '6' THEN 1260000 WHEN '12' THEN 2280000 END
            WHEN 'premium' THEN CASE duration WHEN '1' THEN 450000 WHEN '3' THEN 1260000 WHEN '6' THEN 2340000 WHEN '12' THEN 4320000 END
          END
        ), 0) as revenue
      FROM members
      WHERE registered_at >= CURRENT_DATE - INTERVAL '6 months'
      GROUP BY DATE_TRUNC('month', registered_at)
      ORDER BY month_date ASC
    `)

    res.json({
      success: true,
      data: result.rows.map(r => ({
        month: r.month,
        registrations: parseInt(r.registrations),
        revenue: parseInt(r.revenue),
      }))
    })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

const getPlanDistribution = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT plan, COUNT(*) as count
      FROM members
      GROUP BY plan
    `)
    const total = result.rows.reduce((s, r) => s + parseInt(r.count), 0)
    const colors = { basic: '#6B7280', regular: '#E94560', premium: '#0F3460' }

    res.json({
      success: true,
      data: result.rows.map(r => ({
        name: r.plan.charAt(0).toUpperCase() + r.plan.slice(1),
        value: total > 0 ? Math.round((parseInt(r.count) / total) * 100) : 0,
        count: parseInt(r.count),
        color: colors[r.plan],
      }))
    })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

const getRecentMembers = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM members ORDER BY created_at DESC LIMIT 5'
    )
    const { formatMember } = require('./memberController')
    res.json({ success: true, data: result.rows })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

module.exports = { getDashboardStats, getChartData, getPlanDistribution, getRecentMembers }
