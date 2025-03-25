import { Router } from 'express';
import { createCommission, getCommissions, updateCommission ,deleteCommission} from './commission.controller';
import { adminMiddleware } from '../../middlewares/auth';

const router = Router();

router.get('/', adminMiddleware("admin"), getCommissions);
router.post('/',adminMiddleware("admin"), createCommission);
router.post('/:commissionId', adminMiddleware("admin"), updateCommission);
router.delete('/:commissionId', deleteCommission);

export const commissionRoutes =  router;