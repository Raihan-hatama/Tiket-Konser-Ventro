const multer = require('multer');
const path   = require('path');
const fs     = require('fs');
const { v4: uuidv4 } = require('uuid');

const UPLOAD_ROOT = path.join(__dirname, '..', 'uploads');

// Pastikan folder tujuan ada (tidak bergantung pada current working directory).
const makeStorage = (folder) =>
  multer.diskStorage({
    destination: (req, file, cb) => {
      const dir = path.join(UPLOAD_ROOT, folder);

      try {
        fs.mkdirSync(dir, { recursive: true });
      } catch (err) {
        return cb(err);
      }

      cb(null, dir);
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${uuidv4()}${ext}`);
    },
  });

const imageFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/jpg'];

  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Hanya file gambar (jpg/png) yang diizinkan'));
  }
};

// Batasi ukuran file agar tidak memenuhi penyimpanan server.
const LIMITS = { fileSize: 5 * 1024 * 1024 };

const uploadPayment = multer({ storage: makeStorage('payments'), fileFilter: imageFilter, limits: LIMITS });
const uploadPoster  = multer({ storage: makeStorage('posters'),  fileFilter: imageFilter, limits: LIMITS });
const uploadPhoto   = multer({ storage: makeStorage('photos'),   fileFilter: imageFilter, limits: LIMITS });

module.exports = { uploadPayment, uploadPoster, uploadPhoto };
