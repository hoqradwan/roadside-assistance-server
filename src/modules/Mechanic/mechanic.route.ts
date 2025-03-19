import express from 'express';
import { makeMechanic,createMechanic,getAllMechanics,getMechanicById,updateMechanic,deleteMechanic } from './mechanic.controller';
import { adminMiddleware } from '../../middlewares/auth';

const router = express.Router();

router.post('/make-mechanic', adminMiddleware("admin"), makeMechanic);
router.post('/create', adminMiddleware("admin"), createMechanic);
router.get('/all',  getAllMechanics);
router.get('/:id', getMechanicById);
router.post('/:id',adminMiddleware("admin"), updateMechanic);
router.delete('/:id', deleteMechanic);

export const MechanicRoutes = router;