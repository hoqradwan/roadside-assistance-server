import { Schema, model, Document } from 'mongoose';

interface IFavourite extends Document {
    user: Schema.Types.ObjectId;
    mechanic: Schema.Types.ObjectId;
    isFavorite: boolean;
}

const FavouriteSchema = new Schema<IFavourite>(
    {
        user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        mechanic: { type: Schema.Types.ObjectId, ref: 'Mechanic', required: true },
        isFavorite: { type: Boolean, default: true },
    },
    { timestamps: true }
);

const Favourite = model<IFavourite>('Favourite', FavouriteSchema);

export default Favourite;