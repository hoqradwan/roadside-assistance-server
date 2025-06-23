import Mechanic from "../Mechanic/mechanic.model";
import { UserModel } from "../user/user.model";
import Favourite from "./favourite.model";

export const addFavouriteIntoDB = async (mechanic: string, userId: string) => {
    const mecha = await UserModel.findById(mechanic);
    if (!mecha) throw new Error("Mechanic not found");
    const existingFavourite = await Favourite.findOne({ mechanic, user: userId });
    if (existingFavourite) throw new Error("mechanic already in favourites");
    const result = await Favourite.create({ mechanic, user: userId });  
    return result;
  }
export const toggleFavouriteIntoDB = async (mechanic: string, userId: string) => {
  // Find the mechanic
  const mecha = await UserModel.findById(mechanic);
  if (!mecha) throw new Error("Mechanic not found");

  // Check if the user already has the mechanic in their favorites
  const existingFavourite = await Favourite.findOne({ mechanic, user: userId });

  if (existingFavourite) {
    // If the mechanic is already a favorite, toggle the `isFavorite` field
    const updatedFavourite = await Favourite.findByIdAndUpdate(
      existingFavourite._id,
      { isFavorite: !existingFavourite.isFavorite }, // Toggle the value of isFavorite
      { new: true } // Return the updated document
    );
    return updatedFavourite;
  } else {
    // If the mechanic is not in the user's favorites, add it
    const newFavourite = await Favourite.create({ mechanic, user: userId, isFavorite: true });
    return newFavourite;
  }
};

export const getFavouritesFromDB = async (userId: string) => {
    const result = await Favourite.find({ user: userId }).populate({ path: "mechanic", select: "-password -__v -cuponCode -isDeleted -isActive -uniqueUserId -location -expiryDate -activeDate -status -createdAt -updatedAt" });
    return result
  }
