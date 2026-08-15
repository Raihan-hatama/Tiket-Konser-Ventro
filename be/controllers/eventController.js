const db = require('../config/db');

// ============================================================
// GET ALL EVENTS
// GET /api/events
// ============================================================
const getAll = async (req, res) => {
  try {
    const [events] = await db.query(`
      SELECT
        e.id,
        e.title,
        e.description,
        e.event_date,
        e.event_time,
        e.venue,
        e.poster_url,
        e.status,
        COALESCE(SUM(tc.sold), 0) AS total_sold,
        COALESCE(SUM(tc.quota), 0) AS total_quota
      FROM events e
      LEFT JOIN ticket_categories tc
        ON tc.event_id = e.id
      GROUP BY
        e.id,
        e.title,
        e.description,
        e.event_date,
        e.event_time,
        e.venue,
        e.poster_url,
        e.status
      ORDER BY e.event_date ASC, e.event_time ASC
    `);

    // Ambil artist untuk setiap event
    for (const event of events) {
      const [artists] = await db.query(
        `
        SELECT
          a.id,
          a.name,
          a.bio,
          a.photo_url
        FROM artists a
        INNER JOIN event_artists ea
          ON ea.artist_id = a.id
        WHERE ea.event_id = ?
        `,
        [event.id]
      );

      event.artists = artists;

      // Pastikan angka menjadi number
      event.total_sold = Number(event.total_sold || 0);
      event.total_quota = Number(event.total_quota || 0);
    }

    res.json({
      success: true,
      data: events,
    });
  } catch (err) {
    console.error('getAll events error:', err);

    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};


// ============================================================
// GET ONE EVENT
// GET /api/events/:id
// ============================================================
const getOne = async (req, res) => {
  try {
    const { id } = req.params;

    const [events] = await db.query(
      `
      SELECT
        e.id,
        e.title,
        e.description,
        e.event_date,
        e.event_time,
        e.venue,
        e.poster_url,
        e.status,
        COALESCE(SUM(tc.sold), 0) AS total_sold,
        COALESCE(SUM(tc.quota), 0) AS total_quota
      FROM events e
      LEFT JOIN ticket_categories tc
        ON tc.event_id = e.id
      WHERE e.id = ?
      GROUP BY
        e.id,
        e.title,
        e.description,
        e.event_date,
        e.event_time,
        e.venue,
        e.poster_url,
        e.status
      `,
      [id]
    );

    if (events.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Event tidak ditemukan',
      });
    }

    const event = events[0];

    // ========================================================
    // ARTISTS
    // ========================================================
    const [artists] = await db.query(
      `
      SELECT
        a.id,
        a.name,
        a.bio,
        a.photo_url
      FROM artists a
      INNER JOIN event_artists ea
        ON ea.artist_id = a.id
      WHERE ea.event_id = ?
      ORDER BY a.name ASC
      `,
      [id]
    );

    // ========================================================
    // TICKET CATEGORIES
    // ========================================================
    const [categories] = await db.query(
      `
      SELECT
        id,
        event_id,
        name,
        price,
        quota,
        sold
      FROM ticket_categories
      WHERE event_id = ?
      ORDER BY price ASC, id ASC
      `,
      [id]
    );

    // Konversi data supaya cocok dengan TypeScript mobile
    event.total_sold = Number(event.total_sold || 0);
    event.total_quota = Number(event.total_quota || 0);

    event.artists = artists;

    event.categories = categories.map((category) => ({
      id: category.id,
      event_id: category.event_id,
      name: category.name,
      price: Number(category.price || 0),
      quota: Number(category.quota || 0),
      sold: Number(category.sold || 0),
      available:
        Number(category.quota || 0) - Number(category.sold || 0),
    }));

    res.json({
      success: true,
      data: event,
    });
  } catch (err) {
    console.error('getOne event error:', err);

    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};


// ============================================================
// CREATE EVENT
// POST /api/events
// ============================================================
const create = async (req, res) => {
  const connection = await db.getConnection();

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

    if (!title || !event_date || !event_time || !venue) {
      connection.release();

      return res.status(400).json({
        success: false,
        message:
          'Title, tanggal event, waktu event, dan venue wajib diisi',
      });
    }

    await connection.beginTransaction();

    const poster_url = req.file
      ? `/uploads/posters/${req.file.filename}`
      : null;

    const [result] = await connection.query(
      `
      INSERT INTO events
      (
        title,
        description,
        event_date,
        event_time,
        venue,
        poster_url,
        status
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [
        title,
        description || null,
        event_date,
        event_time,
        venue,
        poster_url,
        status || 'open',
      ]
    );

    const eventId = result.insertId;

    // ========================================================
    // INSERT EVENT ARTISTS
    // ========================================================
    if (artist_ids) {
      let ids = artist_ids;

      if (typeof ids === 'string') {
        try {
          ids = JSON.parse(ids);
        } catch {
          ids = ids
            .split(',')
            .map((id) => Number(id.trim()))
            .filter(Boolean);
        }
      }

      if (Array.isArray(ids)) {
        for (const artistId of ids) {
          if (!artistId) continue;

          await connection.query(
            `
            INSERT INTO event_artists
            (event_id, artist_id)
            VALUES (?, ?)
            `,
            [eventId, artistId]
          );
        }
      }
    }

    await connection.commit();

    res.status(201).json({
      success: true,
      message: 'Event berhasil dibuat',
      data: {
        id: eventId,
      },
    });
  } catch (err) {
    await connection.rollback();

    console.error('create event error:', err);

    res.status(500).json({
      success: false,
      message: err.message,
    });
  } finally {
    connection.release();
  }
};


// ============================================================
// UPDATE EVENT
// PUT /api/events/:id
// ============================================================
const update = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const { id } = req.params;

    const {
      title,
      description,
      event_date,
      event_time,
      venue,
      status,
      artist_ids,
    } = req.body;

    const [existing] = await connection.query(
      'SELECT * FROM events WHERE id = ?',
      [id]
    );

    if (existing.length === 0) {
      connection.release();

      return res.status(404).json({
        success: false,
        message: 'Event tidak ditemukan',
      });
    }

    await connection.beginTransaction();

    let poster_url = existing[0].poster_url;

    if (req.file) {
      poster_url = `/uploads/posters/${req.file.filename}`;
    }

    await connection.query(
      `
      UPDATE events
      SET
        title = ?,
        description = ?,
        event_date = ?,
        event_time = ?,
        venue = ?,
        poster_url = ?,
        status = ?
      WHERE id = ?
      `,
      [
        title ?? existing[0].title,
        description ?? existing[0].description,
        event_date ?? existing[0].event_date,
        event_time ?? existing[0].event_time,
        venue ?? existing[0].venue,
        poster_url,
        status ?? existing[0].status,
        id,
      ]
    );

    // ========================================================
    // UPDATE ARTISTS
    // ========================================================
    if (artist_ids !== undefined) {
      await connection.query(
        'DELETE FROM event_artists WHERE event_id = ?',
        [id]
      );

      let ids = artist_ids;

      if (typeof ids === 'string') {
        try {
          ids = JSON.parse(ids);
        } catch {
          ids = ids
            .split(',')
            .map((artistId) => Number(artistId.trim()))
            .filter(Boolean);
        }
      }

      if (Array.isArray(ids)) {
        for (const artistId of ids) {
          if (!artistId) continue;

          await connection.query(
            `
            INSERT INTO event_artists
            (event_id, artist_id)
            VALUES (?, ?)
            `,
            [id, artistId]
          );
        }
      }
    }

    await connection.commit();

    res.json({
      success: true,
      message: 'Event berhasil diperbarui',
    });
  } catch (err) {
    await connection.rollback();

    console.error('update event error:', err);

    res.status(500).json({
      success: false,
      message: err.message,
    });
  } finally {
    connection.release();
  }
};


// ============================================================
// DELETE EVENT
// DELETE /api/events/:id
// ============================================================
const remove = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const { id } = req.params;

    const [existing] = await connection.query(
      'SELECT id FROM events WHERE id = ?',
      [id]
    );

    if (existing.length === 0) {
      connection.release();

      return res.status(404).json({
        success: false,
        message: 'Event tidak ditemukan',
      });
    }

    await connection.beginTransaction();

    // Hapus relasi artist
    await connection.query(
      'DELETE FROM event_artists WHERE event_id = ?',
      [id]
    );

    // Hapus kategori tiket
    await connection.query(
      'DELETE FROM ticket_categories WHERE event_id = ?',
      [id]
    );

    // Hapus event
    await connection.query(
      'DELETE FROM events WHERE id = ?',
      [id]
    );

    await connection.commit();

    res.json({
      success: true,
      message: 'Event berhasil dihapus',
    });
  } catch (err) {
    await connection.rollback();

    console.error('remove event error:', err);

    res.status(500).json({
      success: false,
      message: err.message,
    });
  } finally {
    connection.release();
  }
};


// ============================================================
// CLOSE EVENT
// PATCH /api/events/:id/close
// ============================================================
const closeEvent = async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await db.query(
      `
      UPDATE events
      SET status = 'closed'
      WHERE id = ?
      `,
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Event tidak ditemukan',
      });
    }

    res.json({
      success: true,
      message: 'Event berhasil ditutup',
    });
  } catch (err) {
    console.error('close event error:', err);

    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};


// ============================================================
// EXPORT
// ============================================================
module.exports = {
  getAll,
  getOne,
  create,
  update,
  remove,
  closeEvent,
};