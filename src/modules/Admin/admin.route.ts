import { Router } from 'express';
import { getAdminWalletOverview, getOverview, acceptWithdrawRequest, getEarningChart } from './admin.controller';
import { adminMiddleware } from '../../middlewares/auth';

const router = Router();

// Get all admins
router.get('/overview', adminMiddleware("admin"), getOverview);
router.get('/earningChart', adminMiddleware("admin"), getEarningChart);
router.get('/wallet-overview',adminMiddleware("admin"),getAdminWalletOverview)
router.post('/accept-withdraw-request/:mechanicId',adminMiddleware("admin"),acceptWithdrawRequest)
// router.get('/summary/:id', getSuummary);



export const AdminRoutes = router;