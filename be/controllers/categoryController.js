const db = require('../config/db');

// GET /api/events/:eventId/categories
const getByEvent = async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT *, (quota - sold) AS available
       FROM ticket_categories
       WHERE event_id = $1
       ORDER BY price ASC, id ASC`,
      [req.params.eventId]
    );

    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('GET CATEGORIES ERROR:', err.message);
    res.status(500).json({ success: false, message: 'Gagal mengambil kategori tiket' });
  }
};

// GET /api/categories/:id
const getOne = async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT *, (quota - sold) AS available
       FROM ticket_categories
       WHERE id = $1`,
      [req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Kategori tiket tidak ditemukan',
      });
    }

    res.json({
      success: true,
      data: rows[0],
    });
  } catch (err) {
    console.error('GET CATEGORY ERROR:', err.message);
    res.status(500).json({ success: false, message: 'Gagal mengambil kategori tiket' });
  }
};

// POST /api/events/:eventId/categories  (admin)
const create = async (req, res) => {
  try {
    const { name, price, quota } = req.body;

    const priceValue = Number(price);
    const quotaValue = Number(quota);

    if (!name || price === undefined || price === null || quota === undefined || quota === null) {
      return res.status(400).json({
        success: false,
        message: 'Nama, harga, dan kuota wajib diisi',
      });
    }

    if (!Number.isFinite(priceValue) || priceValue < 0) {
      return res.status(400).json({ success: false, message: 'Harga tidak valid' });
    }

    if (!Number.isInteger(quotaValue) || quotaValue < 0) {
      return res.status(400).json({ success: false, message: 'Kuota tidak valid' });
    }

    // Pastikan event benar-benar ada (FK juga akan menolak, tetapi
    // pesan error dari sini lebih mudah dipahami).
    const event = await db.query('SELECT id FROM events WHERE id = $1', [
      req.params.eventId,
    ]);

    if (event.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Event tidak ditemukan' });
    }

    const { rows } = await db.query(
      `INSERT INTO ticket_categories (event_id, name, price, quota)
       VALUES ($1, $2, $3, $4)
       RETURNING id, event_id, name, price, quota, sold, created_at`,
      [req.params.eventId, String(name).trim(), priceValue, quotaValue]
    );

    res.status(201).json({
      success: true,
      message: 'Kategori tiket berhasil dibuat',
      data: rows[0],
    });
  } catch (err) {
    console.error('CREATE CATEGORY ERROR:', err.message);
    res.status(500).json({ success: false, message: 'Gagal membuat kategori tiket' });
  }
};

// PUT /api/categories/:id  (admin)
const update = async (req, res) => {
  try {
    const { name, price, quota } = req.body;
    const fields = [];
    const values = [];

    const addField = (column, value) => {
      values.push(value);
      fields.push(`${column} = $${values.length}`);
    };

    if (name) addField('name', String(name).trim());

    if (price !== undefined && price !== null) {
      const priceValue = Number(price);
      if (!Number.isFinite(priceValue) || priceValue < 0) {
        return res.status(400).json({ success: false, message: 'Harga tidak valid' });
      }
      addField('price', priceValue);
    }

    if (quota !== undefined && quota !== null) {
      const quotaValue = Number(quota);
      if (!Number.isInteger(quotaValue) || quotaValue < 0) {
        return res.status(400).json({ success: false, message: 'Kuota tidak valid' });
      }
      addField('quota', quotaValue);
    }

    if (fields.length === 0) {
      return res.status(400).json({ success: false, message: 'Tidak ada data yang diubah' });
    }

    values.push(req.params.id);

    const { rowCount } = await db.query(
      `UPDATE ticket_categories SET ${fields.join(', ')} WHERE id = $${values.length}`,
      values
    );

    if (rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Kategori tiket tidak ditemukan',
      });
    }

    res.json({ success: true, message: 'Kategori tiket berhasil diperbarui' });
  } catch (err) {
    console.error('UPDATE CATEGORY ERROR:', err.message);
    res.status(500).json({ success: false, message: 'Gagal memperbarui kategori tiket' });
  }
};

// DELETE /api/categories/:id  (admin)
const remove = async (req, res) => {
  try {
    const { rowCount } = await db.query(
      'DELETE FROM ticket_categories WHERE id = $1',
      [req.params.id]
    );

    if (rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Kategori tiket tidak ditemukan',
      });
    }

    res.json({ success: true, message: 'Kategori tiket berhasil dihapus' });
  } catch (err) {
    console.error('DELETE CATEGORY ERROR:', err.message);

    if (err.code === '23503') {
      return res.status(409).json({
        success: false,
        message: 'Kategori tiket tidak dapat dihapus karena sudah memiliki pesanan',
      });
    }

    res.status(500).json({ success: false, message: 'Gagal menghapus kategori tiket' });
  }
};

module.exports = { getByEvent, getOne, create, update, remove };
