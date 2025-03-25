import { Router } from 'express';
import { getWalletOverview } from './wallet.controller';
import { adminMiddleware } from '../../middlewares/auth';

const router = Router();

router.get('/',adminMiddleware("admin"), getWalletOverview);
// router.get('/wallet/:id', getWallet);
// router.put('/wallet/:id', updateWallet);
// router.delete('/wallet/:id', deleteWallet);

export const walletRoutes =  router;