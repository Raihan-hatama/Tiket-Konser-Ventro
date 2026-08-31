const express = require('express');

const router = express.Router();

const {
  authenticate,
  adminOnly,
} = require('../middleware/auth');

const {
  uploadPayment,
  uploadPoster,
  uploadPhoto,
} = require('../config/multer');

const authCtrl =
  require('../controllers/authController');

const artistCtrl =
  require('../controllers/artistController');

const eventCtrl =
  require('../controllers/eventController');

const categoryCtrl =
  require('../controllers/categoryController');

const orderCtrl =
  require('../controllers/orderController');

const paymentCtrl =
  require('../controllers/paymentController');

const dashboardCtrl =
  require('../controllers/dashboardController');


// ============================================================
// AUTH
// ============================================================

router.post(
  '/auth/register',
  authCtrl.register
);

router.post(
  '/auth/login',
  authCtrl.login
);

router.get(
  '/auth/me',
  authenticate,
  authCtrl.me
);


// ============================================================
// DASHBOARD
// ============================================================

router.get(
  '/dashboard',
  authenticate,
  adminOnly,
  dashboardCtrl.getDashboard
);


// ============================================================
// ARTISTS
// ============================================================

router.get(
  '/artists',
  artistCtrl.getAll
);

router.get(
  '/artists/:id',
  artistCtrl.getOne
);

router.post(
  '/artists',
  authenticate,
  adminOnly,
  uploadPhoto.single('photo'),
  artistCtrl.create
);

router.put(
  '/artists/:id',
  authenticate,
  adminOnly,
  uploadPhoto.single('photo'),
  artistCtrl.update
);

router.delete(
  '/artists/:id',
  authenticate,
  adminOnly,
  artistCtrl.remove
);


// ============================================================
// EVENTS
// ============================================================

router.get(
  '/events',
  eventCtrl.getAll
);

router.get(
  '/events/:id',
  eventCtrl.getOne
);

router.post(
  '/events',
  authenticate,
  adminOnly,
  uploadPoster.single('poster'),
  eventCtrl.create
);

router.put(
  '/events/:id',
  authenticate,
  adminOnly,
  uploadPoster.single('poster'),
  eventCtrl.update
);

router.delete(
  '/events/:id',
  authenticate,
  adminOnly,
  eventCtrl.remove
);

router.patch(
  '/events/:id/close',
  authenticate,
  adminOnly,
  eventCtrl.closeEvent
);


// ============================================================
// TICKET CATEGORIES
// ============================================================

router.get(
  '/events/:eventId/categories',
  categoryCtrl.getByEvent
);

router.get(
  '/categories/:id',
  categoryCtrl.getOne
);

router.post(
  '/events/:eventId/categories',
  authenticate,
  adminOnly,
  categoryCtrl.create
);

router.put(
  '/categories/:id',
  authenticate,
  adminOnly,
  categoryCtrl.update
);

router.delete(
  '/categories/:id',
  authenticate,
  adminOnly,
  categoryCtrl.remove
);


// ============================================================
// ORDERS
// ============================================================

router.post(
  '/orders',
  authenticate,
  orderCtrl.create
);

router.get(
  '/orders',
  authenticate,
  orderCtrl.getAll
);

router.get(
  '/orders/:id',
  authenticate,
  orderCtrl.getOne
);


// ============================================================
// PAYMENTS
// ============================================================

// ------------------------------------------------------------
// WEBHOOK MIDTRANS
// PENTING: TIDAK memakai authenticate
// ------------------------------------------------------------

router.post(
  '/payments/midtrans/webhook',
  paymentCtrl.webhook
);


// ============================================================
// CREATE MIDTRANS PAYMENT
// Customer membuat pembayaran
//
// POST /api/payments/:orderId/create
// ============================================================

router.post(
  '/payments/:orderId/create',
  authenticate,
  paymentCtrl.createPayment
);


// ============================================================
// PAYMENT DETAIL
// Customer melihat payment miliknya
//
// GET /api/payments/:id
// ============================================================

router.get(
  '/payments/:id',
  authenticate,
  paymentCtrl.getOne
);


// ============================================================
// ADMIN MELIHAT SEMUA PAYMENT
//
// GET /api/payments
// ============================================================

router.get(
  '/payments',
  authenticate,
  adminOnly,
  paymentCtrl.getAll
);


// ============================================================
// LEGACY UPLOAD BUKTI TRANSFER
// ============================================================

router.post(
  '/payments/:orderId/upload',
  authenticate,
  uploadPayment.single('proof'),
  paymentCtrl.uploadProof
);


// ============================================================
// LEGACY VERIFY
// ============================================================

router.patch(
  '/payments/:orderId/verify',
  authenticate,
  adminOnly,
  paymentCtrl.verify
);


module.exports = router;