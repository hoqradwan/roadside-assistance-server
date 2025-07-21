import { Router } from 'express';
import { createOrder, getOrders, getSingleOrder, getOrdersByStatus ,getOrdersByMechanic, markAsComplete, getOrdersByUser, verifyOrderCompletionFromUserEnd, cancelOrder, acceptOrder, getOrderById, } from './order.controller';
import { adminMiddleware } from '../../middlewares/auth';

const router = Router();

// Create a new order
router.get('/user',adminMiddleware("admin","user","mechanic"), getOrdersByUser);
router.get('/:status',adminMiddleware("admin","mechanic","user"), getOrdersByStatus);
router.get('/all',adminMiddleware("admin"), getOrders)
router.post('/', adminMiddleware("user"), createOrder);
// router.post('/makePayment/:orderId', adminMiddleware("user"), makePayment);
router.post('/accept/:orderId', adminMiddleware("mechanic"), acceptOrder);
router.post('/cancel/:orderId', adminMiddleware("mechanic"), cancelOrder);
router.get('/:id', adminMiddleware("admin","user"),  getSingleOrder);
router.get('/admin/:orderId', adminMiddleware("admin"),  getOrderById);
router.get('/:mechanicid',adminMiddleware("admin","mechanic"), getOrdersByMechanic);
router.post('/markComplete/:orderId', adminMiddleware("mechanic"), markAsComplete);
router.post('/verifyOrderCompletion/:orderId', adminMiddleware("user"), verifyOrderCompletionFromUserEnd);

// router.get('/',adminMiddleware("admin","mechanic"), getOrdersByMechanic);

// Get an order by ID

// // Update an order by ID
// router.put('/:id', updateOrder);

// // Delete an order by ID
// router.delete('/:id', deleteOrder);

export const OrderRoutes = router;