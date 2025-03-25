import { Router } from 'express';
import { createOrder, getOrders, getSingleOrder, getOrdersByStatus ,getOrdersByMechanic, markAsComplete} from './order.controller';
import { adminMiddleware } from '../../middlewares/auth';

const router = Router();

// Create a new order
router.post('/', adminMiddleware("user"), createOrder);
router.post('/markComplete/:orderId', adminMiddleware("mechanic"), markAsComplete);
router.get('/status',adminMiddleware("admin","mechanic"), getOrdersByStatus);
router.get('/:mechanicid',adminMiddleware("admin","mechanic"), getOrdersByMechanic);
router.get('/:id', getSingleOrder);
router.get('/all',adminMiddleware("admin"), getOrders);
// router.get('/',adminMiddleware("admin","mechanic"), getOrdersByMechanic);

// Get an order by ID

// // Update an order by ID
// router.put('/:id', updateOrder);

// // Delete an order by ID
// router.delete('/:id', deleteOrder);

export const OrderRoutes = router;