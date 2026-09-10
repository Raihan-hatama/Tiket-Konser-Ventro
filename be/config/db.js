const { Pool } = require('pg');

require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

pool.connect()
  .then(client => {
    console.log('✅ BERHASIL TERHUBUNG KE SUPABASE');
    client.release();
  })
  .catch(err => {
    console.error('❌ GAGAL TERHUBUNG KE SUPABASE');
    console.error(err.message);
  });

module.exports = pool;