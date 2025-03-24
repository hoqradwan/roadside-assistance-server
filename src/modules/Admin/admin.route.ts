import { Router } from 'express';
import { getOverview } from './admin.controller';
import { adminMiddleware } from '../../middlewares/auth';

const router = Router();

// Get all admins
router.get('/overview', adminMiddleware("admin"), getOverview);
// router.get('/summary/:id', getSuummary);



export const AdminRoutes = router;