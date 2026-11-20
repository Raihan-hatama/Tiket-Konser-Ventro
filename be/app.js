require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');

const routes = require('./routes');

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================================
// MIDDLEWARE
// ============================================================

app.use(cors());

app.use(express.json());

app.use(
  express.urlencoded({
    extended: true,
  })
);

// ============================================================
// STATIC FILES
// ============================================================

app.use(
  '/uploads',
  express.static(
    path.join(__dirname, 'uploads')
  )
);

// ============================================================
// API ROUTES
// ============================================================

app.use('/api', routes);

// ============================================================
// HEALTH CHECK
// ============================================================

app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Tiket Konser API berjalan',
  });
});

// ============================================================
// 404 HANDLER
// ============================================================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint tidak ditemukan',
  });
});

// ============================================================
// ERROR HANDLER
// ============================================================

app.use((err, req, res, next) => {
  // Body JSON yang tidak valid
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      success: false,
      message: 'Format JSON pada request tidak valid',
    });
  }

  // Error dari multer (ukuran / tipe file)
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      message: 'Ukuran file maksimal 5 MB',
    });
  }

  if (err.message === 'Hanya file gambar (jpg/png) yang diizinkan') {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }

  console.error('SERVER ERROR:', err.message);

  res.status(500).json({
    success: false,
    message: 'Internal server error',
  });
});

// ============================================================
// START SERVER
// ============================================================

// Tanpa argumen host, Node mengikat alamat "::" (dual-stack) sehingga
// server dapat diakses lewat IPv4 (127.0.0.1 / IP LAN) maupun IPv6 (::1).
// Sebelumnya host dipaksa '0.0.0.0' (IPv4 saja) sehingga browser yang
// membuka "localhost" lewat ::1 mengalami connection timeout.
app.listen(
  PORT,
  () => {
    console.log(
      `Server berjalan di http://localhost:${PORT}`
    );

    console.log(
      `Server dapat diakses dari jaringan di port ${PORT}`
    );
  }
);
