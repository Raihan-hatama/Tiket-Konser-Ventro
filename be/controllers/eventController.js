
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

const parseArtistIds = (artist_ids) => {
  if (!artist_ids) return [];

  let ids = artist_ids;

  if (typeof ids === 'string') {
    try {
      ids = JSON.parse(ids);
    } catch {
      ids = ids.split(',');
    }
  }

  if (!Array.isArray(ids)) return [];

  return [...new Set(
    ids.map(id => Number(id)).filter(id => Number.isInteger(id) && id > 0)
  )];
};

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

    const events = result.rows;

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

      event.artists = artistResult.rows;
      event.total_sold = Number(event.total_sold || 0);
      event.total_quota = Number(event.total_quota || 0);
    }

    return res.json({
      success: true,
      data: events,
    });
  } catch (err) {
    console.error('getAll events error:', err.message);

    return res.status(500).json({
      success: false,
      message: 'Gagal mengambil data event',
    });
  }
};

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

    if (eventResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Event tidak ditemukan',
      });
    }

    const event = eventResult.rows[0];

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

    event.total_sold = Number(event.total_sold || 0);
    event.total_quota = Number(event.total_quota || 0);
    event.artists = artistResult.rows;

    event.categories = categoryResult.rows.map(category => ({
      id: category.id,
      event_id: category.event_id,
      name: category.name,
      price: Number(category.price || 0),
      quota: Number(category.quota || 0),
      sold: Number(category.sold || 0),
      available:
        Number(category.quota || 0) -
        Number(category.sold || 0),
    }));

    return res.json({
      success: true,
      data: event,
    });
  } catch (err) {
    console.error('getOne event error:', err.message);

    return res.status(500).json({
      success: false,
      message: 'Gagal mengambil detail event',
    });
  }
};

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
      return res.status(400).json({
        success: false,
        message: 'Title, tanggal event, waktu event, dan venue wajib diisi',
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

    return res.status(201).json({
      success: true,
      message: 'Event berhasil dibuat',
      data: {
        id: eventId,
      },
    });
  } catch (err) {
    await connection.rollback();

    console.error('create event error:', err.message);

    if (err.code === '23503') {
      return res.status(400).json({
        success: false,
        message: 'Artis yang dipilih tidak ditemukan',
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Gagal membuat event',
    });
  } finally {
    connection.release();
  }
};

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

    await client.query(
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

    if (artist_ids !== undefined) {
      await client.query(
        'DELETE FROM event_artists WHERE event_id = $1',
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

    return res.json({
      success: true,
      message: 'Event berhasil diperbarui',
    });
  } catch (err) {
    await connection.rollback();

    console.error('update event error:', err.message);

    if (err.code === '23503') {
      return res.status(400).json({
        success: false,
        message: 'Artis yang dipilih tidak ditemukan',
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Gagal memperbarui event',
    });
  } finally {
    connection.release();
  }
};

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

    return res.json({
      success: true,
      message: 'Event berhasil dihapus',
    });
  } catch (err) {
    await connection.rollback();

    console.error('remove event error:', err.message);

    // 23503 = foreign key violation: event sudah memiliki pesanan.
    if (err.code === '23503') {
      return res.status(409).json({
        success: false,
        message:
          'Event tidak dapat dihapus karena sudah memiliki pesanan terkait',
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Gagal menghapus event',
    });
  } finally {
    connection.release();
  }
};

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

    return res.json({
      success: true,
      message: 'Event berhasil ditutup',
    });
  } catch (err) {
    console.error('close event error:', err.message);

    return res.status(500).json({
      success: false,
      message: 'Gagal menutup event',
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
