
const db = require('../config/db');

const parseArtistIds = (artistIds) => {
  if (artistIds === undefined || artistIds === null) return [];

  let ids = artistIds;

  if (typeof ids === 'string') {
    try {
      ids = JSON.parse(ids);
    } catch {
      ids = ids.split(',');
    }
  }

  if (!Array.isArray(ids)) return [];

  return [...new Set(
    ids
      .map((id) => Number(id))
      .filter((id) => Number.isInteger(id) && id > 0)
  )];
};

const getAll = async (req, res) => {
  try {
    const result = await db.query(`
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
      const artistResult = await db.query(
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
    console.error('GET ALL EVENTS ERROR:', err);

    return res.status(500).json({
      success: false,
      message: 'Gagal mengambil data event',
    });
  }
};

const getOne = async (req, res) => {
  try {
    const { id } = req.params;

    const eventResult = await db.query(
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

    if (eventResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Event tidak ditemukan',
      });
    }

    const event = eventResult.rows[0];

    const artistResult = await db.query(
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

    const categoryResult = await db.query(
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

    event.total_sold = Number(event.total_sold || 0);
    event.total_quota = Number(event.total_quota || 0);
    event.artists = artistResult.rows;

    event.categories = categoryResult.rows.map((category) => ({
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
    console.error('GET ONE EVENT ERROR:', err);

    return res.status(500).json({
      success: false,
      message: 'Gagal mengambil detail event',
    });
  }
};

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
        message: 'Title, tanggal event, waktu event, dan venue wajib diisi',
      });
    }

    const artistIds = parseArtistIds(artist_ids);

    client = await db.connect();

    await client.query('BEGIN');

    const poster_url = req.file
      ? `/uploads/posters/${req.file.filename}`
      : null;

    const result = await client.query(
      `
        INSERT INTO events (
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

    const eventId = result.rows[0].id;

    for (const artistId of artistIds) {
      await client.query(
        `
          INSERT INTO event_artists (
            event_id,
            artist_id
          )
          VALUES ($1, $2)
        `,
        [eventId, artistId]
      );
    }

    await client.query('COMMIT');

    return res.status(201).json({
      success: true,
      message: 'Event berhasil dibuat',
      data: {
        id: eventId,
      },
    });
  } catch (err) {
    if (client) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        console.error('CREATE EVENT ROLLBACK ERROR:', rollbackError);
      }
    }

    console.error('CREATE EVENT ERROR:', err);

    if (err.code === '23503') {
      return res.status(400).json({
        success: false,
        message: 'Artis yang dipilih tidak ditemukan',
      });
    }

    return res.status(500).json({
      success: false,
      message: err.message || 'Gagal membuat event',
    });
  } finally {
    if (client) client.release();
  }
};

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

    await client.query('BEGIN');

    const existingResult = await client.query(
      'SELECT * FROM events WHERE id = $1 FOR UPDATE',
      [id]
    );

    if (existingResult.rows.length === 0) {
      await client.query('ROLLBACK');

      return res.status(404).json({
        success: false,
        message: 'Event tidak ditemukan',
      });
    }

    const existing = existingResult.rows[0];

    const poster_url = req.file
      ? `/uploads/posters/${req.file.filename}`
      : existing.poster_url;

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

    if (artist_ids !== undefined) {
      const artistIds = parseArtistIds(artist_ids);

      await client.query(
        'DELETE FROM event_artists WHERE event_id = $1',
        [id]
      );

      for (const artistId of artistIds) {
        await client.query(
          `
            INSERT INTO event_artists (
              event_id,
              artist_id
            )
            VALUES ($1, $2)
          `,
          [id, artistId]
        );
      }
    }

    await client.query('COMMIT');

    return res.json({
      success: true,
      message: 'Event berhasil diperbarui',
    });
  } catch (err) {
    if (client) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        console.error('UPDATE EVENT ROLLBACK ERROR:', rollbackError);
      }
    }

    console.error('UPDATE EVENT ERROR:', err);

    if (err.code === '23503') {
      return res.status(400).json({
        success: false,
        message: 'Artis yang dipilih tidak ditemukan',
      });
    }

    return res.status(500).json({
      success: false,
      message: err.message || 'Gagal memperbarui event',
    });
  } finally {
    if (client) client.release();
  }
};

const remove = async (req, res) => {
  let client;

  try {
    const { id } = req.params;

    client = await db.connect();

    await client.query('BEGIN');

    const existing = await client.query(
      'SELECT id FROM events WHERE id = $1 FOR UPDATE',
      [id]
    );

    if (existing.rows.length === 0) {
      await client.query('ROLLBACK');

      return res.status(404).json({
        success: false,
        message: 'Event tidak ditemukan',
      });
    }

    await client.query(
      'DELETE FROM event_artists WHERE event_id = $1',
      [id]
    );

    await client.query(
      'DELETE FROM ticket_categories WHERE event_id = $1',
      [id]
    );

    await client.query(
      'DELETE FROM events WHERE id = $1',
      [id]
    );

    await client.query('COMMIT');

    return res.json({
      success: true,
      message: 'Event berhasil dihapus',
    });
  } catch (err) {
    if (client) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        console.error('DELETE EVENT ROLLBACK ERROR:', rollbackError);
      }
    }

    console.error('DELETE EVENT ERROR:', err);

    if (err.code === '23503') {
      return res.status(409).json({
        success: false,
        message: 'Event tidak dapat dihapus karena sudah memiliki pesanan terkait',
      });
    }

    return res.status(500).json({
      success: false,
      message: err.message || 'Gagal menghapus event',
    });
  } finally {
    if (client) client.release();
  }
};

const closeEvent = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      `
        UPDATE events
        SET status = 'closed'
        WHERE id = $1
        RETURNING id
      `,
      [id]
    );

    if (result.rows.length === 0) {
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
    console.error('CLOSE EVENT ERROR:', err);

    return res.status(500).json({
      success: false,
      message: err.message || 'Gagal menutup event',
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
