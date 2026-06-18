const pool = require('../db/pool')

const getReports = async (req, res) => {
  const { year = new Date().getFullYear() } = req.query

  try {
    // Monthly stats for the year
    const monthlyRes = await pool.query(`
      SELECT
        EXTRACT(MONTH FROM registered_at) as month_num,
        TO_CHAR(DATE_TRUNC('month', registered_at), 'Mon') as month,
        COUNT(*) as registrations,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active,
        COALESCE(SUM(
          CASE plan
            WHEN 'basic' THEN CASE duration WHEN '1' THEN 150000 WHEN '3' THEN 420000 WHEN '6' THEN 780000 WHEN '12' THEN 1440000 END
            WHEN 'regular' THEN CASE duration WHEN '1' THEN 250000 WHEN '3' THEN 690000 WHEN '6' THEN 1260000 WHEN '12' THEN 2280000 END
            WHEN 'premium' THEN CASE duration WHEN '1' THEN 450000 WHEN '3' THEN 1260000 WHEN '6' THEN 2340000 WHEN '12' THEN 4320000 END
          END
        ), 0) as revenue
      FROM members
      WHERE EXTRACT(YEAR FROM registered_at) = $1
      GROUP BY month_num, DATE_TRUNC('month', registered_at)
      ORDER BY month_num ASC
    `, [year])

    // Plan distribution
    const planRes = await pool.query(`
      SELECT plan, COUNT(*) as count
      FROM members
      WHERE EXTRACT(YEAR FROM registered_at) = $1
      GROUP BY plan
    `, [year])

    // Status distribution
    const statusRes = await pool.query(`
      SELECT status, COUNT(*) as count FROM members GROUP BY status
    `)

    // Gender distribution
    const genderRes = await pool.query(`
      SELECT gender, COUNT(*) as count FROM members GROUP BY gender
    `)

    // Duration distribution
    const durationRes = await pool.query(`
      SELECT duration, COUNT(*) as count
      FROM members
      WHERE EXTRACT(YEAR FROM registered_at) = $1
      GROUP BY duration
      ORDER BY CAST(duration AS INTEGER)
    `, [year])

    // Top months
    const totalRevenue = monthlyRes.rows.reduce((s, r) => s + parseInt(r.revenue), 0)
    const totalReg = monthlyRes.rows.reduce((s, r) => s + parseInt(r.registrations), 0)

    res.json({
      success: true,
      data: {
        monthly: monthlyRes.rows.map(r => ({
          month: r.month,
          registrations: parseInt(r.registrations),
          active: parseInt(r.active),
          revenue: parseInt(r.revenue),
        })),
        planDistribution: planRes.rows.map(r => ({
          plan: r.plan,
          count: parseInt(r.count),
        })),
        statusDistribution: statusRes.rows.map(r => ({
          status: r.status,
          count: parseInt(r.count),
        })),
        genderDistribution: genderRes.rows.map(r => ({
          gender: r.gender,
          count: parseInt(r.count),
        })),
        durationDistribution: durationRes.rows.map(r => ({
          duration: r.duration,
          count: parseInt(r.count),
        })),
        summary: {
          totalRevenue,
          totalRegistrations: totalReg,
          avgMonthlyRevenue: monthlyRes.rows.length ? Math.round(totalRevenue / monthlyRes.rows.length) : 0,
          avgMonthlyRegistrations: monthlyRes.rows.length ? Math.round(totalReg / monthlyRes.rows.length) : 0,
        }
      }
    })
  } catch (err) {
    console.error('getReports error:', err)
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

module.exports = { getReports }
