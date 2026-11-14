const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const generateToken = (user) => {
  if (!process.env.JWT_SECRET) {
    throw new Error(
      'JWT_SECRET belum dikonfigurasi pada server. Isi variabel JWT_SECRET di file .env.'
    );
  }

  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    }
  );
};

// POST /api/auth/register
const register = async (req, res) => {
  try {
    const name = String(req.body?.name ?? '').trim();
    const email = String(req.body?.email ?? '').trim().toLowerCase();
    const password = String(req.body?.password ?? '');
    const phoneRaw = req.body?.phone;
    const phone = phoneRaw ? String(phoneRaw).trim() : null;

    // ========================================================
    // VALIDASI
    // ========================================================
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Nama, email, dan password wajib diisi',
      });
    }

    if (name.length < 2 || name.length > 100) {
      return res.status(400).json({
        success: false,
        message: 'Nama harus terdiri dari 2 sampai 100 karakter',
      });
    }

    if (!EMAIL_REGEX.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Format email tidak valid',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password minimal 6 karakter',
      });
    }

    // ========================================================
    // CEK EMAIL
    // ========================================================
    const existing = await db.query(
      'SELECT id FROM users WHERE lower(email) = $1',
      [email]
    );

    if (existing.rowCount > 0) {
      return res.status(409).json({
        success: false,
        message: 'Email sudah terdaftar',
      });
    }

    // ========================================================
    // HASH PASSWORD
    // ========================================================
    const hashed = await bcrypt.hash(password, 10);

    // ========================================================
    // SIMPAN USER
    // ========================================================
    const { rows } = await db.query(
      `INSERT INTO users
        (name, email, password, phone, role)
       VALUES ($1, $2, $3, $4, 'customer')
       RETURNING id, name, email, phone, role, created_at`,
      [name, email, hashed, phone]
    );

    const user = rows[0];

    const token = generateToken(user);

    return res.status(201).json({
      success: true,
      message: 'Registrasi berhasil',
      token,
      user,
    });

  } catch (err) {
    // 23505 = unique_violation (email sudah dipakai, bisa terjadi jika
    // ada dua request registrasi bersamaan).
    if (err.code === '23505') {
      return res.status(409).json({
        success: false,
        message: 'Email sudah terdaftar',
      });
    }

    console.error('REGISTER ERROR:', err.message);

    return res.status(500).json({
      success: false,
      message: 'Registrasi gagal diproses. Silakan coba lagi.',
    });
  }
};


// POST /api/auth/login
const login = async (req, res) => {
  try {
    const email = String(req.body?.email ?? '').trim().toLowerCase();
    const password = String(req.body?.password ?? '');

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email dan password wajib diisi',
      });
    }

    const { rows } = await db.query(
      `SELECT
        id,
        name,
        email,
        phone,
        role,
        password,
        created_at
       FROM users
       WHERE lower(email) = $1`,
      [email]
    );

    if (rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Email atau password salah',
      });
    }

    const user = rows[0];

    const valid = await bcrypt.compare(password, user.password);

    if (!valid) {
      return res.status(401).json({
        success: false,
        message: 'Email atau password salah',
      });
    }

    const token = generateToken(user);

    return res.json({
      success: true,
      message: 'Login berhasil',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        created_at: user.created_at,
      },
    });

  } catch (err) {
    console.error('LOGIN ERROR:', err.message);

    return res.status(500).json({
      success: false,
      message: 'Login gagal diproses. Silakan coba lagi.',
    });
  }
};


// GET /api/auth/me
const me = async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT
        id,
        name,
        email,
        phone,
        role,
        created_at
       FROM users
       WHERE id = $1`,
      [req.user.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User tidak ditemukan',
      });
    }

    return res.json({
      success: true,
      data: rows[0],
    });

  } catch (err) {
    console.error('ME ERROR:', err.message);

    return res.status(500).json({
      success: false,
      message: 'Gagal mengambil data user.',
    });
  }
};

module.exports = {
  register,
  login,
  me,
};
