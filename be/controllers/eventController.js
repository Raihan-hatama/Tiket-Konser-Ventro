const db = require("../config/db");

// GET /api/events
const getAll = async (req, res) => {
  try {
    const [events] = await db.query(`
      SELECT e.*,
        COALESCE(SUM(tc.sold), 0) AS total_sold,
        COALESCE(SUM(tc.quota), 0) AS total_quota
      FROM events e
      LEFT JOIN ticket_categories tc ON tc.event_id = e.id
      GROUP BY e.id
      ORDER BY e.event_date DESC
    `);

    for (const ev of events) {
      const [artists] = await db.query(
        `
        SELECT a.id, a.name, a.photo_url
        FROM artists a
        JOIN event_artists ea ON ea.artist_id = a.id
        WHERE ea.event_id = ?
      `,
        [ev.id]
      );

      ev.artists = artists;
    }

    res.json({
      success: true,
      data: events,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// GET /api/events/:id
const getOne = async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM events WHERE id = ?",
      [req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Event tidak ditemukan",
      });
    }

    const event = rows[0];

    const [artists] = await db.query(
      `
      SELECT a.*
      FROM artists a
      JOIN event_artists ea
      ON ea.artist_id = a.id
      WHERE ea.event_id = ?
    `,
      [event.id]
    );

    const [categories] = await db.query(
      "SELECT * FROM ticket_categories WHERE event_id = ?",
      [event.id]
    );

    event.artists = artists;
    event.categories = categories;

    res.json({
      success: true,
      data: event,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// POST /api/events
const create = async (req, res) => {
  try {
    const {
      title,
      description,
      event_date,
      event_time,
      venue,
      artist_ids,
    } = req.body;

    if (!title || !event_date || !event_time || !venue) {
      return res.status(400).json({
        success: false,
        message: "Judul, tanggal, jam, dan venue wajib diisi",
      });
    }

    // Simpan PATH SAJA
    const poster_url = req.file
      ? `/uploads/posters/${req.file.filename}`
      : null;

    const [result] = await db.query(
      `
      INSERT INTO events
      (title, description, event_date, event_time, venue, poster_url)
      VALUES (?, ?, ?, ?, ?, ?)
    `,
      [
        title,
        description || null,
        event_date,
        event_time,
        venue,
        poster_url,
      ]
    );

    const eventId = result.insertId;

    if (artist_ids) {
      const ids = JSON.parse(artist_ids);

      for (const id of ids) {
        await db.query(
          `
          INSERT IGNORE INTO event_artists
          (event_id, artist_id)
          VALUES (?, ?)
        `,
          [eventId, id]
        );
      }
    }

    res.status(201).json({
      success: true,
      message: "Event berhasil dibuat",
      data: {
        id: eventId,
      },
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// PUT /api/events/:id
const update = async (req, res) => {
  try {
    const {
      title,
      description,
      event_date,
      event_time,
      venue,
      status,
      artist_ids,
    } = req.body;

    // Simpan PATH SAJA
    const poster_url = req.file
      ? `/uploads/posters/${req.file.filename}`
      : undefined;

    const fields = [];
    const values = [];

    if (title) {
      fields.push("title = ?");
      values.push(title);
    }

    if (description) {
      fields.push("description = ?");
      values.push(description);
    }

    if (event_date) {
      fields.push("event_date = ?");
      values.push(event_date);
    }

    if (event_time) {
      fields.push("event_time = ?");
      values.push(event_time);
    }

    if (venue) {
      fields.push("venue = ?");
      values.push(venue);
    }

    if (status) {
      fields.push("status = ?");
      values.push(status);
    }

    if (poster_url !== undefined) {
      fields.push("poster_url = ?");
      values.push(poster_url);
    }

    if (fields.length > 0) {
      values.push(req.params.id);

      await db.query(
        `UPDATE events SET ${fields.join(", ")} WHERE id = ?`,
        values
      );
    }

    if (artist_ids) {
      await db.query(
        "DELETE FROM event_artists WHERE event_id = ?",
        [req.params.id]
      );

      const ids = JSON.parse(artist_ids);

      for (const id of ids) {
        await db.query(
          `
          INSERT IGNORE INTO event_artists
          (event_id, artist_id)
          VALUES (?, ?)
        `,
          [req.params.id, id]
        );
      }
    }

    res.json({
      success: true,
      message: "Event berhasil diperbarui",
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// DELETE
const remove = async (req, res) => {
  try {
    const [result] = await db.query(
      "DELETE FROM events WHERE id = ?",
      [req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Event tidak ditemukan",
      });
    }

    res.json({
      success: true,
      message: "Event berhasil dihapus",
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// PATCH
const closeEvent = async (req, res) => {
  try {
    await db.query(
      'UPDATE events SET status = "closed" WHERE id = ?',
      [req.params.id]
    );

    res.json({
      success: true,
      message: "Penjualan tiket ditutup",
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

module.exports = {
  getAll,
  getOne,
  create,
  update,
  remove,
  closeEvent,
};