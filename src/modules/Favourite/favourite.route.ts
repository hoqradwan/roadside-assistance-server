import { Router, Request } from 'express';
import { adminMiddleware } from '../../middlewares/auth';
import { addFavourite, getFavourites } from './favourite.controller';

const router = Router();

router.post('/', adminMiddleware("user"), addFavourite);

router.get('/all', adminMiddleware("user"), getFavourites);

// // Route to remove a favourite
// router.delete('/remove/:id', removeFavourite);

export const FavouriteRoutes = router;