import Mechanic from "../Mechanic/mechanic.model";
import Favourite from "./favourite.model";

export const addFavouriteIntoDB = async (mechanic: string, userId: string) => {
    const mecha = await Mechanic.findById(mechanic);
    if (!mecha) throw new Error("Mechanic not found");
    const existingFavourite = await Favourite.findOne({ mechanic, user: userId });
    if (existingFavourite) throw new Error("mechanic already in favourites");
    const result = await Favourite.create({ mechanic, user: userId });  
    return result;
  }

