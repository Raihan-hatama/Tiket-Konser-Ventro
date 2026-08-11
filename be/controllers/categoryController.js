const db = require('../config/db');

// GET /api/events/:eventId/categories
const getByEvent = async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT *, (quota - sold) AS available FROM ticket_categories WHERE event_id = ?',
      [req.params.eventId]
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/categories/:id
const getOne = async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM ticket_categories WHERE id = ?",
      [req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Kategori tiket tidak ditemukan",
      });
    }

    res.json({
      success: true,
      data: rows[0],
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

// POST /api/events/:eventId/categories  (admin)
const create = async (req, res) => {
  try {
    const { name, price, quota } = req.body;
    if (!name || !price || !quota)
      return res.status(400).json({ success: false, message: 'Nama, harga, dan kuota wajib diisi' });

    const [result] = await db.query(
      'INSERT INTO ticket_categories (event_id, name, price, quota) VALUES (?, ?, ?, ?)',
      [req.params.eventId, name, price, quota]
    );
    res.status(201).json({ success: true, message: 'Kategori tiket berhasil dibuat', data: { id: result.insertId } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/categories/:id  (admin)
const update = async (req, res) => {
  try {
    const { name, price, quota } = req.body;
    const fields = [];
    const values = [];
    if (name)  { fields.push('name = ?');  values.push(name); }
    if (price) { fields.push('price = ?'); values.push(price); }
    if (quota) { fields.push('quota = ?'); values.push(quota); }

    if (fields.length === 0)
      return res.status(400).json({ success: false, message: 'Tidak ada data yang diubah' });

    values.push(req.params.id);
    await db.query(`UPDATE ticket_categories SET ${fields.join(', ')} WHERE id = ?`, values);
    res.json({ success: true, message: 'Kategori tiket berhasil diperbarui' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/categories/:id  (admin)
const remove = async (req, res) => {
  try {
    await db.query('DELETE FROM ticket_categories WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Kategori tiket berhasil dihapus' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getByEvent, getOne, create, update, remove };
