import paginationBuilder from "../../utils/paginationBuilder";
import Order from "../Order/order.model";
import Service from "../Service/service.model";
import { UserModel } from "../user/user.model";
import Mechanic, { IMechanic } from "./mechanic.model";

export const makeMechanicIntoDB = async (email: string) => {
    const user = await UserModel.findOne({ email });
    if (!user) throw new Error("User not found");
    const result = await UserModel.findOneAndUpdate({ email }, { role: "mechanic" }, { new: true });
    return result;
}

export const createMechanicIntoDB = async (mechanic: IMechanic) => {
    const user = await UserModel.findById(mechanic.user);
    if (!user) throw new Error("User not found");
    if (user.role !== "mechanic") throw new Error("User is not a mechanic");
    if (mechanic.services.length === 0) throw new Error("Mechanic should have atleast one service");
    if (mechanic.rating < 0 || mechanic.rating > 5) throw new Error("Rating should be between 0 and 5");
    if (mechanic.experience < 0) throw new Error("Experience should be greater than 0");
    const services = await Service.find({ _id: { $in: mechanic.services } });
    if (services.length !== mechanic.services.length) throw new Error("Service not found");
    const result = await Mechanic.create(mechanic);
    return result;
}

export const getAllMechanicsFromDB = async ({
    currentPage,
    limit,
}: {
    currentPage: number;
    limit: number;
}) => {
    // Calculate the total number of mechanics
    const totalData = await Mechanic.countDocuments();

    // Use paginationBuilder to get pagination details
    const paginationInfo = paginationBuilder({
        totalData,
        currentPage,
        limit,
    });

    // Query the mechanics with pagination
    const mechanics = await Mechanic.find().populate('user') // Populate user details
        .skip((currentPage - 1) * limit) // Skip the previous pages
        .limit(limit); // Limit the number of results

    // Return paginated data and pagination info
    return {
        pagination: paginationInfo,
        data: mechanics,
    };
};

export const sortMechanics = async ({
    currentUserId,
    sortBy,
    serviceName
  }: {
    currentUserId: string;  // Add currentUserId to calculate distance from this user
    sortBy: 'rating' | 'nearest';
    serviceName?: string;  // Optional: Filter by service name
  }) => {
    // Start with a query for the User model (Mechanics are users too)
    let query = UserModel.find({ role: 'mechanic' });  // Only find users with the role "mechanic"
    if(serviceName) {
      const service = await Service.findOne({ name: serviceName });
      if (!service) throw new Error("Service not found");
      const serviceId = service._id;
      const mechanics = await Mechanic.find({ services: serviceId });
      return mechanics;
    }
    if (sortBy === 'rating') {
      // Sort by rating in descending order
      query = query.sort({ rating: -1 });
    } else if (sortBy === 'nearest') {
      // Nearest logic (using geospatial queries)
      
      // Fetch the current user's location
      const currentUser = await UserModel.findById(currentUserId);
    
      if (!currentUser || !currentUser.location || !currentUser.location.coordinates) {
        throw new Error("User location not found");
      }
  
      const userLocation = currentUser.location.coordinates;  // Extract the user's coordinates
  
      // Apply geospatial sorting to find nearest mechanics
      query = query.where('location')
        .near({
          center: { type: 'Point', coordinates: userLocation },
          spherical: true,  // Use spherical geometry for calculating distances
          maxDistance: 10000,  // Optional: Set a maximum distance (e.g., 10 km)
        });
    }
  
    // Execute the query and get sorted mechanics
    const sortedMechanics = await query;
  
    return sortedMechanics;
  };

export const toggleAvailabilityIntoDB = async (mechanicId: string) => {
    const mechanic = await Mechanic.findById(mechanicId);
    if (!mechanic) throw new Error("Mechanic not found");
    
    const result = await Mechanic.findByIdAndUpdate(mechanicId, { isAvailable: !mechanic.isAvailable }, { new: true });
    return result;
}

