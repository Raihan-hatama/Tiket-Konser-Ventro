const db = require('../config/db');

const BASE = (process.env.BASE_URL || '').replace(/\/+$/, '');

const fileUrl = (folder, filename) =>
  BASE ? `${BASE}/uploads/${folder}/${filename}` : `/uploads/${folder}/${filename}`;

// GET /api/artists
const getAll = async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM artists ORDER BY name ASC');
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('GET ARTISTS ERROR:', err.message);
    res.status(500).json({ success: false, message: 'Gagal mengambil data artis' });
  }
};

// GET /api/artists/:id
const getOne = async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT * FROM artists WHERE id = $1',
      [req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Artis tidak ditemukan' });
    }

    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('GET ARTIST ERROR:', err.message);
    res.status(500).json({ success: false, message: 'Gagal mengambil data artis' });
  }
};

// POST /api/artists  (admin)
const create = async (req, res) => {
  try {
    const name = String(req.body?.name ?? '').trim();
    const bio = req.body?.bio ? String(req.body.bio) : null;

    if (!name) {
      return res.status(400).json({ success: false, message: 'Nama artis wajib diisi' });
    }

    const photo_url = req.file ? fileUrl('photos', req.file.filename) : null;

    const { rows } = await db.query(
      `INSERT INTO artists (name, bio, photo_url)
       VALUES ($1, $2, $3)
       RETURNING id, name, bio, photo_url, created_at`,
      [name, bio, photo_url]
    );

    res.status(201).json({
      success: true,
      message: 'Artis berhasil ditambahkan',
      data: rows[0],
    });
  } catch (err) {
    console.error('CREATE ARTIST ERROR:', err.message);
    res.status(500).json({ success: false, message: 'Gagal menambahkan artis' });
  }
};

// PUT /api/artists/:id  (admin)
const update = async (req, res) => {
  try {
    const { name, bio } = req.body;
    const photo_url = req.file ? fileUrl('photos', req.file.filename) : undefined;

    const fields = [];
    const values = [];

    const addField = (column, value) => {
      values.push(value);
      fields.push(`${column} = $${values.length}`);
    };

    if (name) addField('name', String(name).trim());
    if (bio) addField('bio', String(bio));
    if (photo_url) addField('photo_url', photo_url);

    if (fields.length === 0) {
      return res.status(400).json({ success: false, message: 'Tidak ada data yang diubah' });
    }

    values.push(req.params.id);

    const { rowCount } = await db.query(
      `UPDATE artists SET ${fields.join(', ')} WHERE id = $${values.length}`,
      values
    );

    if (rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Artis tidak ditemukan' });
    }

    res.json({ success: true, message: 'Artis berhasil diperbarui' });
  } catch (err) {
    console.error('UPDATE ARTIST ERROR:', err.message);
    res.status(500).json({ success: false, message: 'Gagal memperbarui artis' });
  }
};

// DELETE /api/artists/:id  (admin)
const remove = async (req, res) => {
  try {
    const { rowCount } = await db.query(
      'DELETE FROM artists WHERE id = $1',
      [req.params.id]
    );

    if (rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Artis tidak ditemukan' });
    }

    res.json({ success: true, message: 'Artis berhasil dihapus' });
  } catch (err) {
    console.error('DELETE ARTIST ERROR:', err.message);

    if (err.code === '23503') {
      return res.status(409).json({
        success: false,
        message: 'Artis tidak dapat dihapus karena masih dipakai pada event',
      });
    }

    res.status(500).json({ success: false, message: 'Gagal menghapus artis' });
  }
};

module.exports = { getAll, getOne, create, update, remove };
