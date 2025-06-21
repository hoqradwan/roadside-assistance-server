import express from 'express';
import { makeMechanic,createMechanic,getAllMechanics,getMechanicById,updateMechanic,deleteMechanic, toggleAvailability, getSortedMechanics, getSingleMechanic, getAllTestMechanics } from './mechanic.controller';
import { adminMiddleware } from '../../middlewares/auth';

const router = express.Router();

router.post('/make-mechanic', adminMiddleware("admin"), makeMechanic);
router.post('/create', adminMiddleware("admin"), createMechanic);
router.get('/test/all', adminMiddleware("admin","user"), getAllTestMechanics);
router.get('/all',adminMiddleware("admin","user"),  getAllMechanics);
// router.get('/sorted',adminMiddleware("admin","user"), getSortedMechanicsWithSearch);
router.get('/:id', adminMiddleware("admin","user","mechanic"), getSingleMechanic);
// router.get('/:id', adminMiddleware("admin","user"), getMechanicById);
router.post('/:id',adminMiddleware("admin","mechanic"), updateMechanic);
router.post('/toggle-availability/:id',adminMiddleware("admin","mechanic"), toggleAvailability);
router.delete('/:id',adminMiddleware("admin"), deleteMechanic);

export const MechanicRoutes = router;