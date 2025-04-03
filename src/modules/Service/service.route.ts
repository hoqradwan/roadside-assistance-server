import express from 'express';
import { createService, getAllServices, getServiceById,updateService,deleteService, deleteServiceByMechanic, addServiceToMechanic } from './service.controller';
import { adminMiddleware } from '../../middlewares/auth';
const router = express.Router();
router.post('/create',adminMiddleware("admin"), createService);
router.get('/all', adminMiddleware("admin","user","mechanic"),  getAllServices);
router.get('/:id', adminMiddleware("admin","user","mechanic"), getServiceById);
router.post('/:id', adminMiddleware("admin"), updateService);
router.post('/mechanic/:serviceId', adminMiddleware("mechanic"),deleteServiceByMechanic);
router.post('/mechanic/add/:serviceId', adminMiddleware("mechanic"),addServiceToMechanic);

router.delete('/:id', adminMiddleware("admin"),deleteService);
export const ServiceRoutes = router;