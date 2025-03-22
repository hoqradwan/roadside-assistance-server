import { Router } from 'express';
import { createVehicle, getVehicles,  updateVehicle, deleteVehicle, getSingleVehicle } from './vehicle.controller';
import { adminMiddleware } from '../../middlewares/auth';

const router = Router();

router.post('/', adminMiddleware("admin","user"), createVehicle);
router.get('/all', adminMiddleware("admin","user"), getVehicles);
router.get('/:id',adminMiddleware("admin","user"), getSingleVehicle);
router.put('/:id',adminMiddleware("admin","user"), updateVehicle);
router.delete('/:id',adminMiddleware("admin","user"), deleteVehicle);

export const VehicleRoutes = router;