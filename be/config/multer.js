const multer = require('multer');
const path   = require('path');
const { v4: uuidv4 } = require('uuid');

const makeStorage = (folder) =>
  multer.diskStorage({
    destination: (req, file, cb) => cb(null, `uploads/${folder}`),
    filename:    (req, file, cb) => cb(null, uuidv4() + path.extname(file.originalname)),
  });

const imageFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/jpg'];
  if (allowed.includes(file.mimetype)) cb(null, true);
  else cb(new Error('Hanya file gambar (jpg/png) yang diizinkan'));
};

const uploadPayment = multer({ storage: makeStorage('payments'), fileFilter: imageFilter });
const uploadPoster  = multer({ storage: makeStorage('posters'),  fileFilter: imageFilter });
const uploadPhoto   = multer({ storage: makeStorage('photos'),   fileFilter: imageFilter });

module.exports = { uploadPayment, uploadPoster, uploadPhoto };
