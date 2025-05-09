import express from 'express';
import { makeMechanic,createMechanic,getAllMechanics,getMechanicById,updateMechanic,deleteMechanic, toggleAvailability, getSortedMechanics } from './mechanic.controller';
import { adminMiddleware } from '../../middlewares/auth';

const router = express.Router();

router.post('/make-mechanic', adminMiddleware("admin"), makeMechanic);
router.post('/create', adminMiddleware("admin"), createMechanic);
router.get('/all',adminMiddleware("admin","user"),  getAllMechanics);
router.get('/sorted',adminMiddleware("admin","user"), getSortedMechanics);
router.get('/:id', adminMiddleware("admin","user"), getMechanicById);
router.post('/:id',adminMiddleware("admin","mechanic"), updateMechanic);
router.post('/toggle-availability/:id',adminMiddleware("admin","mechanic"), toggleAvailability);
router.delete('/:id',adminMiddleware("admin"), deleteMechanic);

export const MechanicRoutes = router;