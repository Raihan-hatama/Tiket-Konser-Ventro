const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

const generateToken = (user) =>
  jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN,
    }
  );

// POST /api/auth/register
const register = async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;

    // Validasi
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Nama, email, dan password wajib diisi',
      });
    }

    // Cek email
    const [existing] = await db.query(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Email sudah terdaftar',
      });
    }

    // Hash password
    const hashed = await bcrypt.hash(password, 10);

    // Role customer dibuat sebagai parameter
    const role = 'customer';

    const [result] = await db.query(
      `INSERT INTO users
      (name, email, password, phone, role)
      VALUES (?, ?, ?, ?, ?)`,
      [
        name,
        email,
        hashed,
        phone || null,
        role,
      ]
    );

    const user = {
      id: result.insertId,
      name,
      email,
      phone: phone || null,
      role,
    };

    const token = generateToken(user);

    return res.status(201).json({
      success: true,
      message: 'Registrasi berhasil',
      token,
      user,
    });

  } catch (err) {
    console.error('REGISTER ERROR:', err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};


// POST /api/auth/login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email dan password wajib diisi',
      });
    }

    const [rows] = await db.query(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );

    if (rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Email atau password salah',
      });
    }

    const user = rows[0];

    const valid = await bcrypt.compare(
      password,
      user.password
    );

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
      },
    });

  } catch (err) {
    console.error('LOGIN ERROR:', err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};


// GET /api/auth/me
const me = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT
        id,
        name,
        email,
        phone,
        role,
        created_at
      FROM users
      WHERE id = ?`,
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
    console.error('ME ERROR:', err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

module.exports = {
  register,
  login,
  me,
};