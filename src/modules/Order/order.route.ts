import { Router } from 'express';
import { createOrder, getOrders, getSingleOrder } from './order.controller';

const router = Router();

// Create a new order
router.post('/', createOrder);
router.get('/', getOrders);

// Get an order by ID
router.get('/:id', getSingleOrder);

// // Update an order by ID
// router.put('/:id', updateOrder);

// // Delete an order by ID
// router.delete('/:id', deleteOrder);

export const OrderRoutes = router;