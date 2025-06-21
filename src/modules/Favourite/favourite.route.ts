import { Router, Request } from 'express';
import { adminMiddleware } from '../../middlewares/auth';
import { addFavourite, getFavourites, removeFavourite, toggleFavourite } from './favourite.controller';

const router = Router();

router.post('/toggle/:id', adminMiddleware("user"), toggleFavourite);
router.post('/', adminMiddleware("user"), addFavourite);
router.get('/all', adminMiddleware("user"), getFavourites);

export const FavouriteRoutes = router;