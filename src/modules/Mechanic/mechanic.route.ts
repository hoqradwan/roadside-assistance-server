import express from 'express';
import { makeMechanic,createMechanic,updateMechanic,deleteMechanic, toggleAvailability, getSortedMechanics, getSingleMechanic, getAllTestMechanics, getMechanicWithServicePrice, getSingleMechanicAdmin, getAvailability,  setServiceRadius } from './mechanic.controller';
import { adminMiddleware } from '../../middlewares/auth';

const router = express.Router();

router.post('/make-mechanic', adminMiddleware("admin"), makeMechanic);
router.post('/create', adminMiddleware("admin"), createMechanic);
router.post("/serviceRadius",adminMiddleware("mechanic"), setServiceRadius)
router.get('/all', adminMiddleware("admin","user"), getAllTestMechanics);
router.get('/availability',adminMiddleware("admin","mechanic"), getAvailability);
// router.get('/all',adminMiddleware("admin","user"),  getAllMechanics);
// router.get('/sorted',adminMiddleware("admin","user"), getSortedMechanicsWithSearch);
router.get('/services/:id', adminMiddleware("admin","user","mechanic"), getMechanicWithServicePrice);
router.get('/:userId', adminMiddleware("admin","user","mechanic"), getSingleMechanic);
router.get('/admin/:userId', adminMiddleware("admin","user","mechanic"), getSingleMechanicAdmin);
// router.get('/:id', adminMiddleware("admin","user"), getMechanicById);
router.post('/:id',adminMiddleware("admin","mechanic"), updateMechanic);
router.post('/toggle-availability/:id',adminMiddleware("admin","mechanic"), toggleAvailability);
router.delete('/:id',adminMiddleware("admin"), deleteMechanic);

export const MechanicRoutes = router;