const db = require('../config/db');

// ============================================================
// HELPER
// ============================================================

const parseArtistIds = (artistIds) => {
  if (artistIds === undefined || artistIds === null) return null;

  let ids = artistIds;

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

  if (!Array.isArray(ids)) return null;

  return ids
    .map((id) => Number(id))
    .filter((id) => Number.isInteger(id) && id > 0);
};

// ============================================================
// GET ALL EVENTS
// GET /api/events
// ============================================================
const getAll = async (req, res) => {
  try {
    const { rows: events } = await db.query(`
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
      const { rows: artists } = await db.query(
        `
        SELECT
          a.id,
          a.name,
          a.bio,
          a.photo_url
        FROM artists a
        INNER JOIN event_artists ea
          ON ea.artist_id = a.id
        WHERE ea.event_id = $1
        ORDER BY a.name ASC
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
    console.error('getAll events error:', err.message);

    res.status(500).json({
      success: false,
      message: 'Gagal mengambil data event',
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

    const { rows: events } = await db.query(
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
      WHERE e.id = $1
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
    const { rows: artists } = await db.query(
      `
      SELECT
        a.id,
        a.name,
        a.bio,
        a.photo_url
      FROM artists a
      INNER JOIN event_artists ea
        ON ea.artist_id = a.id
      WHERE ea.event_id = $1
      ORDER BY a.name ASC
      `,
      [id]
    );

    // ========================================================
    // TICKET CATEGORIES
    // ========================================================
    const { rows: categories } = await db.query(
      `
      SELECT
        id,
        event_id,
        name,
        price,
        quota,
        sold
      FROM ticket_categories
      WHERE event_id = $1
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
    console.error('getOne event error:', err.message);

    res.status(500).json({
      success: false,
      message: 'Gagal mengambil detail event',
    });
  }
};


// ============================================================
// CREATE EVENT
// POST /api/events
// ============================================================
const create = async (req, res) => {
  let client;

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
      return res.status(400).json({
        success: false,
        message:
          'Title, tanggal event, waktu event, dan venue wajib diisi',
      });
    }

    client = await db.connect();
    await client.query('BEGIN');

    const poster_url = req.file
      ? `/uploads/posters/${req.file.filename}`
      : null;

    const { rows } = await client.query(
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
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id
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

    const eventId = rows[0].id;

    // ========================================================
    // INSERT EVENT ARTISTS
    // ========================================================
    const ids = parseArtistIds(artist_ids);

    if (ids && ids.length > 0) {
      for (const artistId of ids) {
        await client.query(
          `
          INSERT INTO event_artists
          (event_id, artist_id)
          VALUES ($1, $2)
          ON CONFLICT (event_id, artist_id) DO NOTHING
          `,
          [eventId, artistId]
        );
      }
    }

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: 'Event berhasil dibuat',
      data: {
        id: eventId,
      },
    });
  } catch (err) {
    if (client) {
      await client.query('ROLLBACK').catch(() => {});
    }

    console.error('create event error:', err.message);

    if (err.code === '23503') {
      return res.status(400).json({
        success: false,
        message: 'Artis yang dipilih tidak ditemukan',
      });
    }

    res.status(500).json({
      success: false,
      message: 'Gagal membuat event',
    });
  } finally {
    if (client) client.release();
  }
};


// ============================================================
// UPDATE EVENT
// PUT /api/events/:id
// ============================================================
const update = async (req, res) => {
  let client;

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

    client = await db.connect();

    const { rows: existingRows } = await client.query(
      'SELECT * FROM events WHERE id = $1',
      [id]
    );

    if (existingRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Event tidak ditemukan',
      });
    }

    const existing = existingRows[0];

    await client.query('BEGIN');

    let poster_url = existing.poster_url;

    if (req.file) {
      poster_url = `/uploads/posters/${req.file.filename}`;
    }

    await client.query(
      `
      UPDATE events
      SET
        title = $1,
        description = $2,
        event_date = $3,
        event_time = $4,
        venue = $5,
        poster_url = $6,
        status = $7
      WHERE id = $8
      `,
      [
        title ?? existing.title,
        description ?? existing.description,
        event_date ?? existing.event_date,
        event_time ?? existing.event_time,
        venue ?? existing.venue,
        poster_url,
        status ?? existing.status,
        id,
      ]
    );

    // ========================================================
    // UPDATE ARTISTS
    // ========================================================
    if (artist_ids !== undefined) {
      await client.query(
        'DELETE FROM event_artists WHERE event_id = $1',
        [id]
      );

      const ids = parseArtistIds(artist_ids);

      if (ids && ids.length > 0) {
        for (const artistId of ids) {
          await client.query(
            `
            INSERT INTO event_artists
            (event_id, artist_id)
            VALUES ($1, $2)
            ON CONFLICT (event_id, artist_id) DO NOTHING
            `,
            [id, artistId]
          );
        }
      }
    }

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Event berhasil diperbarui',
    });
  } catch (err) {
    if (client) {
      await client.query('ROLLBACK').catch(() => {});
    }

    console.error('update event error:', err.message);

    if (err.code === '23503') {
      return res.status(400).json({
        success: false,
        message: 'Artis yang dipilih tidak ditemukan',
      });
    }

    res.status(500).json({
      success: false,
      message: 'Gagal memperbarui event',
    });
  } finally {
    if (client) client.release();
  }
};


// ============================================================
// DELETE EVENT
// DELETE /api/events/:id
// ============================================================
const remove = async (req, res) => {
  let client;

  try {
    const { id } = req.params;

    client = await db.connect();

    const { rows: existing } = await client.query(
      'SELECT id FROM events WHERE id = $1',
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Event tidak ditemukan',
      });
    }

    await client.query('BEGIN');

    // Hapus relasi artist
    await client.query(
      'DELETE FROM event_artists WHERE event_id = $1',
      [id]
    );

    // Hapus kategori tiket
    await client.query(
      'DELETE FROM ticket_categories WHERE event_id = $1',
      [id]
    );

    // Hapus event
    await client.query(
      'DELETE FROM events WHERE id = $1',
      [id]
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Event berhasil dihapus',
    });
  } catch (err) {
    if (client) {
      await client.query('ROLLBACK').catch(() => {});
    }

    console.error('remove event error:', err.message);

    // 23503 = foreign key violation: event sudah memiliki pesanan.
    if (err.code === '23503') {
      return res.status(409).json({
        success: false,
        message:
          'Event tidak dapat dihapus karena sudah memiliki pesanan terkait',
      });
    }

    res.status(500).json({
      success: false,
      message: 'Gagal menghapus event',
    });
  } finally {
    if (client) client.release();
  }
};


// ============================================================
// CLOSE EVENT
// PATCH /api/events/:id/close
// ============================================================
const closeEvent = async (req, res) => {
  try {
    const { id } = req.params;

    const { rowCount } = await db.query(
      `
      UPDATE events
      SET status = 'closed'
      WHERE id = $1
      `,
      [id]
    );

    if (rowCount === 0) {
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
    console.error('close event error:', err.message);

    res.status(500).json({
      success: false,
      message: 'Gagal menutup event',
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
