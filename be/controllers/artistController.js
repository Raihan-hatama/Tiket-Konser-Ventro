const db = require('../config/db');

const BASE = process.env.BASE_URL;

// GET /api/artists
const getAll = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM artists ORDER BY name ASC');
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/artists/:id
const getOne = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM artists WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Artis tidak ditemukan' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/artists  (admin)
const create = async (req, res) => {
  try {
    const { name, bio } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Nama artis wajib diisi' });

    const photo_url = req.file ? `${BASE}/uploads/photos/${req.file.filename}` : null;
    const [result] = await db.query(
      'INSERT INTO artists (name, bio, photo_url) VALUES (?, ?, ?)',
      [name, bio || null, photo_url]
    );
    res.status(201).json({ success: true, message: 'Artis berhasil ditambahkan', data: { id: result.insertId } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/artists/:id  (admin)
const update = async (req, res) => {
  try {
    const { name, bio } = req.body;
    const photo_url = req.file ? `${BASE}/uploads/photos/${req.file.filename}` : undefined;

    const fields = [];
    const values = [];
    if (name)      { fields.push('name = ?');      values.push(name); }
    if (bio)       { fields.push('bio = ?');        values.push(bio); }
    if (photo_url) { fields.push('photo_url = ?');  values.push(photo_url); }

    if (fields.length === 0)
      return res.status(400).json({ success: false, message: 'Tidak ada data yang diubah' });

    values.push(req.params.id);
    await db.query(`UPDATE artists SET ${fields.join(', ')} WHERE id = ?`, values);
    res.json({ success: true, message: 'Artis berhasil diperbarui' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/artists/:id  (admin)
const remove = async (req, res) => {
  try {
    await db.query('DELETE FROM artists WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Artis berhasil dihapus' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getAll, getOne, create, update, remove };
