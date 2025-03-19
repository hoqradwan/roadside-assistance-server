import { Router, Request } from 'express';
import { adminMiddleware } from '../../middlewares/auth';
import { addFavourite, getFavourites, removeFavourite } from './favourite.controller';

const router = Router();

router.post('/', adminMiddleware("user"), addFavourite);
router.get('/all', adminMiddleware("user"), getFavourites);
router.delete('/:id', adminMiddleware("user"), removeFavourite);

export const FavouriteRoutes = router;