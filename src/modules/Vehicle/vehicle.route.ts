import { Router } from 'express';
import { createVehicle, getVehicles, getVehicleById, updateVehicle, deleteVehicle } from './vehicle.controller';

const router = Router();

router.post('/', createVehicle);
router.get('/all', getVehicles);
router.get('/:id', getVehicleById);
router.put('/:id', updateVehicle);
router.delete('/:id', deleteVehicle);

export const VehicleRoutes = router;