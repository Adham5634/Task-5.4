import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { requireAuth } from '../middleware/auth.js';
import {
  getAllRequests,
  getRequest,
  createRequest,
  updateRequest,
  deleteRequest
} from '../controllers/maintenanceController.js';

const router = Router();

// DoS protection: throttle every maintenance endpoint per client (IP). Once a
// client exceeds MAX_REQUESTS in the window it gets `429 Too Many Requests`
// instead of hitting the database again. The limiter runs first so a flood is
// cut off before any controller work happens.
const maintenanceLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  limit: 30, // max requests per client per window (page load + a few actions fits easily)
  standardHeaders: 'draft-7', // send RateLimit-* headers so clients can back off
  legacyHeaders: false,
  message: { message: 'Too many requests, please try again later.' }
});
router.use(maintenanceLimiter);

// Reading is public; writing requires a logged-in user.
//
// CSRF: the state-changing routes (POST/PATCH/DELETE) are additionally
// protected by the global anti-CSRF middleware mounted in app.js, so the auth
// cookie alone is no longer enough — a valid CSRF token header is required.
router.get('/', getAllRequests);
router.get('/:id', getRequest);
router.post('/', requireAuth, createRequest);
router.patch('/:id', requireAuth, updateRequest);
router.delete('/:id', requireAuth, deleteRequest);

export default router;
