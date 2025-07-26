import { Router, Response } from 'express';
import { getWalletOverview } from './wallet.controller';
import { adminMiddleware } from '../../middlewares/auth';
import { CustomRequest } from '../../utils/customRequest';
import Wallet from './wallet.model';

const router = Router();

router.get('/',adminMiddleware("admin","mechanic"), getWalletOverview);
router.post("/",adminMiddleware("admin"),async(req:CustomRequest,res:Response)=>{
    const wallet = await Wallet.create({user: req.user.id, ...req.body});
    res.send(wallet);
})
// router.get('/wallet/:id', getWallet);
// router.put('/wallet/:id', updateWallet);
// router.delete('/wallet/:id', deleteWallet);

export const walletRoutes =  router;
