const db = require("../config/db");

const getDashboard = async (req, res) => {
  try {
    // =========================
    // TOTAL DATA
    // =========================

    const [[{ total_events }]] = await db.query(
      "SELECT COUNT(*) AS total_events FROM events"
    );

    const [[{ total_artists }]] = await db.query(
      "SELECT COUNT(*) AS total_artists FROM artists"
    );

    const [[{ total_orders }]] = await db.query(
      "SELECT COUNT(*) AS total_orders FROM orders"
    );

    const [[{ total_payments }]] = await db.query(
      "SELECT COUNT(*) AS total_payments FROM payments"
    );

    // =========================
    // TOTAL REVENUE
    // =========================

    const [[{ total_revenue }]] = await db.query(`
      SELECT COALESCE(SUM(amount), 0) AS total_revenue
      FROM payments
      WHERE status = 'verified'
    `);

    // =========================
    // TIKET PER EVENT
    // =========================

    const [tickets_per_event] = await db.query(`
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

    const [recent_orders] = await db.query(`
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

    // =========================
    // DEBUG
    // =========================

    console.log("DASHBOARD DATA:");
    console.log({
      total_events,
      total_artists,
      total_orders,
      total_payments,
      total_revenue,
    });

    // =========================
    // RESPONSE
    // =========================

    res.json({
      success: true,
      data: {
        summary: {
          total_events,
          total_artists,
          total_orders,
          total_payments,
          total_revenue,
        },

        tickets_per_event,

        recent_orders,
      },
    });

  } catch (err) {
    console.error("DASHBOARD ERROR:");
    console.error(err);

    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

module.exports = {
  getDashboard,
};