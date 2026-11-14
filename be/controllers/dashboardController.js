const db = require("../config/db");

const getDashboard = async (req, res) => {
  try {
    // =========================
    // TOTAL DATA
    // =========================

    const totalEvents = await db.query(
      "SELECT COUNT(*) AS total FROM events"
    );

    const totalArtists = await db.query(
      "SELECT COUNT(*) AS total FROM artists"
    );

    const totalOrders = await db.query(
      "SELECT COUNT(*) AS total FROM orders"
    );

    const totalPayments = await db.query(
      "SELECT COUNT(*) AS total FROM payments"
    );

    // =========================
    // TOTAL REVENUE
    // =========================

    const revenue = await db.query(`
      SELECT COALESCE(SUM(amount), 0) AS total_revenue
      FROM payments
      WHERE status = 'verified'
    `);

    // =========================
    // TIKET PER EVENT
    // =========================

    const ticketsPerEvent = await db.query(`
      SELECT
        e.id,
        e.title,
        COALESCE(SUM(tc.sold), 0) AS sold,
        COALESCE(SUM(tc.quota), 0) AS quota
      FROM events e
      LEFT JOIN ticket_categories tc
        ON tc.event_id = e.id
      GROUP BY e.id, e.title
      ORDER BY sold DESC
    `);

    // =========================
    // PESANAN TERBARU
    // =========================

    const recentOrders = await db.query(`
      SELECT
        o.id,
        o.order_code,
        o.total_price,
        o.status,
        o.created_at,
        u.name AS customer_name,
        e.title AS event_title
      FROM orders o
      JOIN users u
        ON u.id = o.user_id
      JOIN events e
        ON e.id = o.event_id
      ORDER BY o.created_at DESC
      LIMIT 10
    `);

    const summary = {
      total_events: totalEvents.rows[0].total,
      total_artists: totalArtists.rows[0].total,
      total_orders: totalOrders.rows[0].total,
      total_payments: totalPayments.rows[0].total,
      total_revenue: revenue.rows[0].total_revenue,
    };

    res.json({
      success: true,
      data: {
        summary,
        tickets_per_event: ticketsPerEvent.rows,
        recent_orders: recentOrders.rows,
      },
    });

  } catch (err) {
    console.error("DASHBOARD ERROR:", err.message);

    res.status(500).json({
      success: false,
      message: "Gagal mengambil data dashboard",
    });
  }
};

module.exports = {
  getDashboard,
};
