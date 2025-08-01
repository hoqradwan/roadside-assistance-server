import httpStatus from "http-status";
import AppError from "../../errors/AppError";
import paginationBuilder from "../../utils/paginationBuilder";
import { MechanicServiceRateModel } from "../MechanicServiceRate/mechanicServiceRate.model";
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
export const setServiceRadiusIntoDB = async(mechanicId : string , mechanicServiceAreaWithLocationData: any) =>{
        const { latitude, longitude, serviceRadius } = mechanicServiceAreaWithLocationData;
    const user = await UserModel.findById(mechanicId);
    if(!user){
      throw new Error("Mechanic not found");
    }
      user.location.coordinates = [longitude, latitude];
      user.serviceRadius = serviceRadius; // Save the service area radius
    await user.save();
    return user;
    
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
  return result
}

export const getAllMechanicsFromDB = async ({
  currentPage,
  limit,
  userId
}: {
  currentPage: number;
  limit: number;
  userId: string; // User ID to calculate distance from
}) => {
  const AVERAGE_SPEED_KMPH = 30;

  // Calculate the total number of mechanics
  const totalData = await Mechanic.countDocuments();

  // Use paginationBuilder to get pagination details
  const paginationInfo = paginationBuilder({
    totalData,
    currentPage,
    limit,
  });
  const user = await UserModel.findById(userId);

  if (!user || !user.location || !user.location.coordinates) {
    throw new AppError(httpStatus.BAD_REQUEST, "User or location not found");
  }
  // Query the mechanics with pagination
  const mechanics = await Mechanic.find().populate('user') // Populate user details
    .skip((currentPage - 1) * limit) // Skip the previous pages
    .limit(limit); // Limit the number of results
  const geoNearResult = await UserModel.aggregate([
    {
      $geoNear: {
        near: {
          type: "Point",
          coordinates: [user.location.coordinates[0], user.location.coordinates[1]],
        },
        key: "location", // Ensure your 'location' field has an index for geo queries
        distanceField: "distanceInMeters",
        spherical: true,
      },
    },
    {
      $match: {
        role: "mechanic", // Make sure you are only selecting mechanics (or adjust based on your role field)
      },
    },
    {
      $project: {
        _id: 1,
        name: 1,
         image: 1,
        distanceInKm: { $divide: ["$distanceInMeters", 1000] }, // Convert to kilometers
      },
    },
    {
      $addFields: {
        estimatedTimeInMinutes: {
          $ceil: {
            $divide: [
              { $multiply: ["$distanceInKm", 60] },
              AVERAGE_SPEED_KMPH, // Define average speed constant, e.g., 50 km/h
            ],
          },
        },
      },
    },
  ]);

  if (!geoNearResult.length) {
    throw new AppError(httpStatus.NOT_FOUND, "No mechanics found nearby");
  }

  // Map the result to return mechanic details and ETA
  const result = geoNearResult.map((mechanic) => {
    console.log({mechanic});
    return {
    mechanicId: mechanic._id,
    mechanicName: mechanic.name,
    mechanicImage: mechanic.image || '', // Assuming image is optional
    distance: `${mechanic.distanceInKm.toFixed(2)} km`,
    eta: `${mechanic.estimatedTimeInMinutes} mins`,
  }
  });
 
  // Resolve promises and gather all the mechanic details (rating, experience, etc.)
  const data = await Promise.all(
    result.map(async (res) => {
      const mechanic = await Mechanic.findOne({ user: res.mechanicId });
      if (!mechanic) throw new Error("Mechanic not found");
      
      return {
        ...res,
        rating: mechanic?.rating || 0, // Add rating if available
        experience: mechanic?.experience || 0, // Add experience if available
      };
    })
  );

  // Return paginated data and pagination info
  return {
    pagination: paginationInfo,
    data
  };
};






// export const sortMechanics = async ({
//   currentUserId,
//   sortBy,
//   serviceName,
// }: {
//   currentUserId: string;  // Add currentUserId to calculate distance from this user
//   sortBy: 'rating' | 'nearest';
//   serviceName?: string;  // Optional: Filter by service name
// }) => {
//   // Start with a query for the User model (Mechanics are users too)
//   let query = UserModel.find({ role: 'mechanic' });  // Only find users with the role "mechanic"
  
//   if (serviceName) {
//     // Use regex for partial matching of service name
//     const serviceSearchQuery = { name: { $regex: serviceName, $options: 'i' } };  // Case-insensitive partial match
    
//     // Find services that match the partial service name
//     const services = await Service.find(serviceSearchQuery);  // Find services by the partial service name
//     if (!services.length) throw new Error("No services found with the given name");

//     const serviceIds = services.map(service => service._id);  // Extract service IDs

//     // Find mechanics that offer the services that match the partial name
//     const mechanics = await MechanicServiceRateModel.find({
//       'services.service': { $in: serviceIds },  // Match mechanics offering the services
//     }).populate('mechanic services.service');

//     return mechanics;
//   }

//   if (sortBy === 'rating') {
//     // Sort by rating in descending order
//     query = query.sort({ rating: -1 });
//   } else if (sortBy === 'nearest') {
//     // Nearest logic (using geospatial queries)

//     // Fetch the current user's location
//     const currentUser = await UserModel.findById(currentUserId);

//     if (!currentUser || !currentUser.location || !currentUser.location.coordinates) {
//       throw new Error("User location not found");
//     }

//     const userLocation = currentUser.location.coordinates;  // Extract the user's coordinates

//     // Apply geospatial sorting to find nearest mechanics
//     query = query.where('location')
//       .near({
//         center: { type: 'Point', coordinates: userLocation },
//         spherical: true,  // Use spherical geometry for calculating distances
//         maxDistance: 10000,  // Optional: Set a maximum distance (e.g., 10 km)
//       });
//   }

//   // Execute the query and get sorted mechanics
//   const sortedMechanics = await query;

//   return sortedMechanics;
// };


export const sortMechanics = async ({
  currentUserId,
  sortBy,
  serviceName,
}: {
  currentUserId: string;  // Add currentUserId to calculate distance from this user
  sortBy: 'rating' | 'nearest';
  serviceName?: string;  // Optional: Filter by service name
}) => {
  // Start with a query for the User model (Mechanics are users too)
  let query = UserModel.find({ role: 'mechanic' }).select('name image location'); // Only get name, image, and location
  
  if (serviceName) {
    // Use regex for partial matching of service name
    const serviceSearchQuery = { name: { $regex: serviceName, $options: 'i' } };  // Case-insensitive partial match
    
    // Find services that match the partial service name
    const services = await Service.find(serviceSearchQuery);  // Find services by the partial service name
    if (!services.length) throw new Error("No services found with the given name");

    const serviceIds = services.map(service => service._id);  // Extract service IDs

    // Find mechanics that offer the services that match the partial name
    const mechanics = await MechanicServiceRateModel.find({
      'services.service': { $in: serviceIds },  // Match mechanics offering the services
    }).populate('mechanic services.service') // Populate mechanic and services
      .select('mechanic name image location'); // Only return the mechanic's name, image, and location

    return mechanics.map((mechanic) => mechanic.mechanic); // Return only the mechanic object (without extra data)
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
  const mechanicUser = await UserModel.findById(mechanicId);
  if (!mechanicUser) throw new Error("Mechanic not found");
  const mechanic = await Mechanic.findOne({ user: mechanicId });
  if (!mechanic) throw new Error("Mechanic details not found");

  // Toggle the availability
  const newAvailability = !mechanic.isAvailable;

  // Update both Mechanic and User models for consistency
  await Mechanic.updateOne({ user: mechanicId }, { isAvailable: newAvailability });

  // Return the updated mechanic document
  const result = await Mechanic.findOne({ user: mechanicId });
  return result;
}

export const getSingleMechanicFromDB = async (mechanicId: string) => {
  // Fetch the mechanic from the User model
  const mechanic = await UserModel.findById(mechanicId).select("-password -__v -location -createdAt -status -updatedAt -cuponCode -expiryDate -isDeleted -isActive -uniqueUserId -activeDate");
  if (!mechanic) throw new Error("Mechanic not found");

  // Fetch the mechanic details from the Mechanic model
  const mechanicDetails = await Mechanic.findOne({ user: mechanicId }).select("-__v -createdAt -updatedAt -serviceCount -services -uniqueMechanicId");
  if (!mechanicDetails) {
    throw new Error("Mechanic details not found");
  }

  // Fetch the services and rate
  const serviceWithRate = await MechanicServiceRateModel.findOne({ mechanic: mechanicDetails.user }).populate("services.service");

  // Merge the mechanic and mechanicDetails objects under one object
  const mergedMechanicData = {
    _id: mechanic._id,
    name: mechanic.name,
    email: mechanic.email,
    image: mechanic.image,
    role: mechanic.role,
    // Merge mechanicDetails data into this object
    rating: mechanicDetails.rating,
    experience: mechanicDetails.experience,
    description: mechanicDetails.description,
    isAvailable: mechanicDetails.isAvailable
  };

  // Return the merged data with the separate serviceWithRate
  return {
    mechanic: mergedMechanicData,
    serviceWithRate,
  };
};
export const getSingleMechanicAdminFromDB = async (mechanicId: string) => {
  // Fetch the mechanic from the User model
  const mechanic = await UserModel.findById(mechanicId).select("-password -__v -location -createdAt -status -updatedAt -cuponCode -expiryDate -isDeleted -isActive -uniqueUserId -activeDate");
  if (!mechanic) throw new Error("Mechanic not found");

  // Fetch the mechanic details from the Mechanic model
  const mechanicDetails = await Mechanic.findOne({ user: mechanicId }).select("-__v -createdAt -updatedAt -serviceCount -services -uniqueMechanicId");
  if (!mechanicDetails) {
    throw new Error("Mechanic details not found");
  }
  // Count the number of services offered by the mechanic
  const totalServicesCount = await MechanicServiceRateModel.aggregate([
    { $match: { mechanic: mechanicDetails.user } },
    { $project: { serviceCount: { $size: "$services" } } }
  ]);
  const serviceCount = totalServicesCount[0]?.serviceCount || 0;
  const totalCompletedOrders = await Order.find({mechanic : mechanicDetails.user, status: "completed"}).countDocuments();
  // Calculate the total sales (sum of totalPrice for completed orders)
  const totalSalesAgg = await Order.aggregate([
    {
      $match: {
        mechanic: mechanicDetails.user,
        status: "completed"
      }
    },
    {
      $group: {
        _id: null,
        totalSales: { $sum: "$total" }
      }
    }
  ]);
  const totalSales = totalSalesAgg[0]?.totalSales || 0;
  const mechanicWallet = await Wallet.findOne({user: mechanicId});
  // Fetch the services and rate

  // Merge the mechanic and mechanicDetails objects under one object
  const mergedMechanicData = {
    _id: mechanic._id,
    name: mechanic.name,
    email: mechanic.email,
    image: mechanic.image,
    role: mechanic.role,
    // Merge mechanicDetails data into this object
    rating: mechanicDetails.rating,
    experience: mechanicDetails.experience,
    description: mechanicDetails.description,
    isAvailable: mechanicDetails.isAvailable
  };

  // Return the merged data with the separate serviceWithRate
  return {
    mechanic: mergedMechanicData,
    totalServices : serviceCount,
    totalCompletedOrders,
    totalSales,
    availableBalance : mechanicWallet?.availableBalance,
    totalWithdraw  : mechanicWallet?.withdrawnAmount

  };
};

/* {
  "car": "68514fa3b34a40f5e30d68a1",
  "pickupDate": "2025-07-10T10:00:00Z",
  "returnDate": "2025-07-17T10:00:00Z",
  "address": "123 Main St, Dhaka",
  "phone": "+8801712345678",
  "dob": "1995-04-25T00:00:00Z",
  "licenseNo": "A1234567"
}
 */
import mongoose from "mongoose";
import Wallet from "../Wallet/wallet.model";
import { error } from "winston";
// export const getAllTestMechanicsFromDB = async ({
//   currentPage,
//   limit,
//   userId,
//   serviceName  // New parameter for searching service by name
// }: {
//   currentPage: number;
//   limit: number;
//   userId: string;
//   serviceName?: string; // Optional serviceName parameter
// }) => {
//   const AVERAGE_SPEED_KMPH = 30;

//   // Calculate the total number of mechanics
//   const totalData = await Mechanic.countDocuments();

//   // Use paginationBuilder to get pagination details
//   const paginationInfo = paginationBuilder({
//     totalData,
//     currentPage,
//     limit,
//   });

//   const user = await UserModel.findById(userId);

//   if (!user || !user.location || !user.location.coordinates) {
//     throw new AppError(httpStatus.BAD_REQUEST, "User or location not found");
//   }

//   let geoNearResult = [];

//   if (serviceName) {
//     console.log("Searching for mechanics with service name:", serviceName);
    
//     // Step 1: Find mechanics who offer the service
//     const mechanisWithService = await MechanicServiceRateModel.aggregate([
//       {
//         $lookup: {
//           from: "services", // Lookup the services collection
//           localField: "services.service", // Join on the service field in MechanicServiceRate
//           foreignField: "_id", // Reference the Service collection's _id
//           as: "servicesDetails",
//         },
//       },
//       {
//         $unwind: "$servicesDetails", // Unwind the services array
//       },
//       {
//         $match: {
//           "servicesDetails.name": { $regex: serviceName, $options: "i" }, // Match service name (case-insensitive)
//         },
//       },
//     ]);

//     // Step 2: Get geoNear results for each mechanic
//     const geoNearResults = await Promise.all(
//       mechanisWithService.map(async (mechanic) => {
//         console.log(mechanic.mechanic);
//         // Perform the geoNear aggregation for each mechanic
//         const geoNearResult = await UserModel.aggregate([
//           {
//             $geoNear: {
//               near: {
//                 type: "Point",
//                 coordinates: [user.location.coordinates[0], user.location.coordinates[1]],
//               },
//               key: "location", // Mechanic's location to calculate distance
//               distanceField: "distanceInMeters",
//               spherical: true,
//             },
//           },
//           {
//             $match: {
//               role: "mechanic", // Only include mechanics
//               _id: mechanic.mechanic, // Ensure we're looking up the correct mechanic
//             },
//           },
//           {
//             $lookup: {
//               from: "favourites", // Lookup the favourites collection
//               let: { mechanicId: "$_id" },
//               pipeline: [
//                 {
//                   $match: {
//                     $expr: {
//                       $and: [
//                         { $eq: ["$mechanic", "$$mechanicId"] },
//                         { $eq: ["$user", new mongoose.Types.ObjectId(userId)] },
//                         { $eq: ["$isFavorite", true] }
//                       ]
//                     }
//                   }
//                 }
//               ],
//               as: "favouriteInfo"
//             }
//           },
//           {
//             $project: {
//               _id: 1,
//               name: 1,
//               image: 1,
//               distanceInKm: { $divide: ["$distanceInMeters", 1000] }, // Calculate distance in km
//               isFavourite: { 
//                 $cond: { 
//                   if: { $gt: [{ $size: "$favouriteInfo" }, 0] }, 
//                   then: true, 
//                   else: false 
//                 } 
//               }
//             },
//           },
//           {
//             $addFields: {
//               estimatedTimeInMinutes: {
//                 $ceil: {
//                   $divide: [
//                     { $multiply: ["$distanceInKm", 60] },
//                     AVERAGE_SPEED_KMPH, // Define average speed constant, e.g., 30 km/h
//                   ],
//                 },
//               },
//             },
//           },
//         ]);
//         console.log("geoNearResult for mechanic:", geoNearResult);
//         return geoNearResult; // Return the geoNearResult for this mechanic
//       })
//     );
//     // Flatten the array of geoNearResults
//     geoNearResult = geoNearResults.flat();

//   } else {
//     // If no serviceName is provided, default to get all mechanics in the area
//     geoNearResult = await UserModel.aggregate([
//       {
//         $geoNear: {
//           near: {
//             type: "Point",
//             coordinates: [user.location.coordinates[0], user.location.coordinates[1]],
//           },
//           key: "location",
//           distanceField: "distanceInMeters",
//           spherical: true,
//         },
//       },
//       {
//         $match: {
//           role: "mechanic",
//         },
//       },
//       {
//         $lookup: {
//           from: "favourites", // Lookup the favourites collection
//           let: { mechanicId: "$_id" },
//           pipeline: [
//             {
//               $match: {
//                 $expr: {
//                   $and: [
//                     { $eq: ["$mechanic", "$$mechanicId"] },
//                     { $eq: ["$user", new mongoose.Types.ObjectId(userId)] },
//                     { $eq: ["$isFavorite", true] }
//                   ]
//                 }
//               }
//             }
//           ],
//           as: "favouriteInfo"
//         }
//       },
//       {
//         $project: {
//           _id: 1,
//           name: 1,
//           image: 1,
//           distanceInKm: { $divide: ["$distanceInMeters", 1000] }, // Calculate distance in km
//           isFavourite: { 
//             $cond: { 
//               if: { $gt: [{ $size: "$favouriteInfo" }, 0] }, 
//               then: true, 
//               else: false 
//             } 
//           }
//         },
//       },
//       {
//         $addFields: {
//           estimatedTimeInMinutes: {
//             $ceil: {
//               $divide: [
//                 { $multiply: ["$distanceInKm", 60] },
//                 AVERAGE_SPEED_KMPH, // Define average speed constant, e.g., 30 km/h
//               ],
//             },
//           },
//         },
//       },
//     ]);
//   }

//   if (!geoNearResult.length) {
//     throw new AppError(httpStatus.NOT_FOUND, "No mechanics found nearby");
//   }

//   // Map the result to return mechanic details and ETA
//   const result = geoNearResult.map((mechanic) => ({
//     mechanicId: mechanic._id,
//     mechanicName: mechanic.mechanicName || mechanic.name,  // Use mechanicName from service or fallback to name
//     mechanicImage: mechanic.mechanicImage || mechanic.image || "", // Image from the UserModel or fallback to empty
//     price: mechanic.price || 0, // Include the service price
//     distance: mechanic.distanceInKm ? `${mechanic.distanceInKm.toFixed(2)} km` : "N/A", // Handle undefined distance
//     eta: mechanic.estimatedTimeInMinutes ? `${mechanic.estimatedTimeInMinutes} mins` : "N/A", // Handle undefined ETA
//     isFavourite: mechanic.isFavourite || false, // Include the favourite status
//   }));

//   // Return paginated data and pagination info
//   return {
//     pagination: paginationInfo,
//     data: result,  // Return the filtered mechanics
//   };
// };

export const getMechanicWithServicePriceFromDB = async(mechanicId:string)=>{
  const mechanic = await UserModel.findById(mechanicId).select("-password -__v -location -createdAt -status -updatedAt -cuponCode -expiryDate -isDeleted -isActive -uniqueUserId -activeDate");
  if(mechanic.role !== "mechanic") throw new Error("User is not a mechanic");
  if (!mechanic) throw new Error("Mechanic not found");
    const serviceWithRate = await MechanicServiceRateModel.findOne({ mechanic:mechanicId }).populate("services.service").select("-__v -createdAt -updatedAt -mechanic ");
return serviceWithRate

}

// export const getAllTestMechanicsFromDB = async ({
//   currentPage,
//   limit,
//   userId,
//   serviceName  // New parameter for searching service by name
// }: {
//   currentPage: number;
//   limit: number;
//   userId: string;
//   serviceName?: string | undefined; // Optional serviceName parameter
// }) => {
//   const AVERAGE_SPEED_KMPH = 30;

//   // Calculate the total number of mechanics
//   const totalData = await Mechanic.countDocuments();

//   // Use paginationBuilder to get pagination details
//   const paginationInfo = paginationBuilder({
//     totalData,
//     currentPage,
//     limit,
//   });

//   const user = await UserModel.findById(userId);

//   if (!user || !user.location || !user.location.coordinates) {
//     throw new AppError(httpStatus.BAD_REQUEST, "User or location not found");
//   }

//   let geoNearResult = [];
//   // if (serviceName && serviceName === undefined) {
//   //   return [];
//   // }
//   // Clean and check if serviceName is provided AND not empty
//   const cleanServiceName = serviceName?.replace(/^["']|["']$/g, '').trim();
  
//   if (cleanServiceName && cleanServiceName !== "") {
    
//     // Get unique mechanic IDs who offer the service
//     const uniqueMechanicIds = await MechanicServiceRateModel.aggregate([
//       {
//         $lookup: {
//           from: "services", // Lookup the services collection
//           localField: "services.service", // Join on the service field in MechanicServiceRate
//           foreignField: "_id", // Reference the Service collection's _id
//           as: "servicesDetails",
//         },
//       },
//       {
//         $unwind: "$servicesDetails", // Unwind the services array
//       },
//       {
//         $match: {
//           "servicesDetails.name": { $regex: cleanServiceName, $options: "i" }, // Match service name (case-insensitive) with cleaned value
//         },
//       },
//       {
//         $group: {
//           _id: "$mechanic", // Group by mechanic ID to get unique mechanics
//         }
//       },
//       {
//         $project: {
//           mechanicId: "$_id",
//           _id: 0
//         }
//       }
//     ]);

//     // Extract the mechanic IDs
//     const mechanicIds = uniqueMechanicIds.map(item => item.mechanicId);

//     // Perform geoNear aggregation with mechanic ID filter
//     geoNearResult = await UserModel.aggregate([
//       {
//         $geoNear: {
//           near: {
//             type: "Point",
//             coordinates: [user.location.coordinates[0], user.location.coordinates[1]],
//           },
//           key: "location", // Mechanic's location to calculate distance
//           distanceField: "distanceInMeters",
//           spherical: true,
//         },
//       },
//       {
//         $match: {
//           role: "mechanic", // Only include mechanics
//           _id: { $in: mechanicIds }, // Filter by the mechanics who offer the service
//         },
//       },
//       {
//         $lookup: {
//           from: "favourites", // Lookup the favourites collection
//           let: { mechanicId: "$_id" },
//           pipeline: [
//             {
//               $match: {
//                 $expr: {
//                   $and: [
//                     { $eq: ["$mechanic", "$$mechanicId"] },
//                     { $eq: ["$user", new mongoose.Types.ObjectId(userId)] },
//                     { $eq: ["$isFavorite", true] }
//                   ]
//                 }
//               }
//             }
//           ],
//           as: "favouriteInfo"
//         }
//       },
//       {
//         $project: {
//           _id: 1,
//           name: 1,
//           image: 1,
//           distanceInKm: { $divide: ["$distanceInMeters", 1000] }, // Calculate distance in km
//           isFavourite: { 
//             $cond: { 
//               if: { $gt: [{ $size: "$favouriteInfo" }, 0] }, 
//               then: true, 
//               else: false 
//             } 
//           }
//         },
//       },
//       {
//         $addFields: {
//           estimatedTimeInMinutes: {
//             $ceil: {
//               $divide: [
//                 { $multiply: ["$distanceInKm", 60] },
//                 AVERAGE_SPEED_KMPH, // Define average speed constant, e.g., 30 km/h
//               ],
//             },
//           },
//         },
//       },
//     ]);

//   } else {
//     // If no serviceName is provided OR serviceName is empty, get all mechanics in the area
//     geoNearResult = await UserModel.aggregate([
//       {
//         $geoNear: {
//           near: {
//             type: "Point",
//             coordinates: [user.location.coordinates[0], user.location.coordinates[1]],
//           },
//           key: "location",
//           distanceField: "distanceInMeters",
//           spherical: true,
//         },
//       },
//       {
//         $match: {
//           role: "mechanic",
//         },
//       },
//       {
//         $lookup: {
//           from: "favourites", // Lookup the favourites collection
//           let: { mechanicId: "$_id" },
//           pipeline: [
//             {
//               $match: {
//                 $expr: {
//                   $and: [
//                     { $eq: ["$mechanic", "$$mechanicId"] },
//                     { $eq: ["$user", new mongoose.Types.ObjectId(userId)] },
//                     { $eq: ["$isFavorite", true] }
//                   ]
//                 }
//               }
//             }
//           ],
//           as: "favouriteInfo"
//         }
//       },
//       {
//         $project: {
//           _id: 1,
//           name: 1,
//           image: 1,
//           distanceInKm: { $divide: ["$distanceInMeters", 1000] }, // Calculate distance in km
//           isFavourite: { 
//             $cond: { 
//               if: { $gt: [{ $size: "$favouriteInfo" }, 0] }, 
//               then: true, 
//               else: false 
//             } 
//           }
//         },
//       },
//       {
//         $addFields: {
//           estimatedTimeInMinutes: {
//             $ceil: {
//               $divide: [
//                 { $multiply: ["$distanceInKm", 60] },
//                 AVERAGE_SPEED_KMPH, // Define average speed constant, e.g., 30 km/h
//               ],
//             },
//           },
//         },
//       },
//     ]);
//   }

//   if (!geoNearResult.length) {
//     throw new AppError(httpStatus.NOT_FOUND, "No mechanics found nearby");
//   }

//   // Map the result to return mechanic details and ETA
//   const result = geoNearResult.map((mechanic) => ({
//     mechanicId: mechanic._id,
//     mechanicName: mechanic.mechanicName || mechanic.name,  // Use mechanicName from service or fallback to name
//     mechanicImage: mechanic.mechanicImage || mechanic.image || "", // Image from the UserModel or fallback to empty
//     price: mechanic.price || 0, // Include the service price
//     distance: mechanic.distanceInKm ? `${mechanic.distanceInKm.toFixed(2)} km` : "N/A", // Handle undefined distance
//     eta: mechanic.estimatedTimeInMinutes ? `${mechanic.estimatedTimeInMinutes} mins` : "N/A", // Handle undefined ETA
//     isFavourite: mechanic.isFavourite || false, // Include the favourite status
//   }));

//   // Return paginated data and pagination info
//   return {
//     pagination: paginationInfo,
//     data: result,  // Return the filtered mechanics
//   };
// };


export const getAllTestMechanicsFromDB = async ({
  currentPage,
  limit,
  userId,
  serviceName  // New parameter for searching service by name
}: {
  currentPage: number;
  limit: number;
  userId: string;
  serviceName?: string | undefined; // Optional serviceName parameter
}) => {
  const AVERAGE_SPEED_KMPH = 30;
  const MAX_DISTANCE_KM = 200; // Maximum distance in kilometers
  const MAX_DISTANCE_METERS = MAX_DISTANCE_KM * 1000; // Convert to meters for MongoDB

  // Calculate the total number of mechanics
  const totalData = await Mechanic.countDocuments();

  // Use paginationBuilder to get pagination details
  const paginationInfo = paginationBuilder({
    totalData,
    currentPage,
    limit,
  });

  const user = await UserModel.findById(userId);

  if (!user || !user.location || !user.location.coordinates) {
    throw new AppError(httpStatus.BAD_REQUEST, "User or location not found");
  }

  let geoNearResult = [];
  
  // Clean and check if serviceName is provided AND not empty
  const cleanServiceName = serviceName?.replace(/^["']|["']$/g, '').trim();
  
  if (cleanServiceName && cleanServiceName !== "") {
    
    // Get unique mechanic IDs who offer the service
    const uniqueMechanicIds = await MechanicServiceRateModel.aggregate([
      {
        $lookup: {
          from: "services", // Lookup the services collection
          localField: "services.service", // Join on the service field in MechanicServiceRate
          foreignField: "_id", // Reference the Service collection's _id
          as: "servicesDetails",
        },
      },
      {
        $unwind: "$servicesDetails", // Unwind the services array
      },
      {
        $match: {
          "servicesDetails.name": { $regex: cleanServiceName, $options: "i" }, // Match service name (case-insensitive) with cleaned value
        },
      },
      {
        $group: {
          _id: "$mechanic", // Group by mechanic ID to get unique mechanics
        }
      },
      {
        $project: {
          mechanicId: "$_id",
          _id: 0
        }
      }
    ]);

    // Extract the mechanic IDs
    const mechanicIds = uniqueMechanicIds.map(item => item.mechanicId);

    // Perform geoNear aggregation with mechanic ID filter and distance limit
    geoNearResult = await UserModel.aggregate([
      {
        $geoNear: {
          near: {
            type: "Point",
            coordinates: [user.location.coordinates[0], user.location.coordinates[1]],
          },
          key: "location", // Mechanic's location to calculate distance
          distanceField: "distanceInMeters",
          maxDistance: MAX_DISTANCE_METERS, // ADD THIS: Limit to 60km (60000 meters)
          spherical: true,
        },
      },
      {
        $match: {
          role: "mechanic", // Only include mechanics
          _id: { $in: mechanicIds }, // Filter by the mechanics who offer the service
        },
      },
      {
        $lookup: {
          from: "favourites", // Lookup the favourites collection
          let: { mechanicId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$mechanic", "$$mechanicId"] },
                    { $eq: ["$user", new mongoose.Types.ObjectId(userId)] },
                    { $eq: ["$isFavorite", true] }
                  ]
                }
              }
            }
          ],
          as: "favouriteInfo"
        }
      },
      {
        $project: {
          _id: 1,
          name: 1,
          image: 1,
          distanceInKm: { $divide: ["$distanceInMeters", 1000] }, // Calculate distance in km
          isFavourite: { 
            $cond: { 
              if: { $gt: [{ $size: "$favouriteInfo" }, 0] }, 
              then: true, 
              else: false 
            } 
          }
        },
      },
      {
        $addFields: {
          estimatedTimeInMinutes: {
            $ceil: {
              $divide: [
                { $multiply: ["$distanceInKm", 60] },
                AVERAGE_SPEED_KMPH, // Define average speed constant, e.g., 30 km/h
              ],
            },
          },
        },
      },
    ]);

  } else if(cleanServiceName === undefined || cleanServiceName === "") {

    // If no serviceName is provided OR serviceName is empty, get all mechanics in the area
    geoNearResult = await UserModel.aggregate([
      { 
        $geoNear: {
          near: {
            type: "Point",
            coordinates: [user.location.coordinates[0], user.location.coordinates[1]],
          },
          key: "location",
          distanceField: "distanceInMeters",
          // maxDistance: MAX_DISTANCE_METERS, // ADD THIS: Limit to 60km (60000 meters)
          spherical: true,
        },
      },
      {
        $match: {
          role: "mechanic",
        },
      },
      {
        $lookup: {
          from: "favourites", // Lookup the favourites collection
          let: { mechanicId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$mechanic", "$$mechanicId"] },
                    { $eq: ["$user", new mongoose.Types.ObjectId(userId)] },
                    { $eq: ["$isFavorite", true] }
                  ]
                }
              }
            }
          ],
          as: "favouriteInfo"
        }
      },
      {
        $project: {
          _id: 1,
          name: 1,
          image: 1,
          distanceInKm: { $divide: ["$distanceInMeters", 1000] }, // Calculate distance in km
          isFavourite: { 
            $cond: { 
              if: { $gt: [{ $size: "$favouriteInfo" }, 0] }, 
              then: true, 
              else: false 
            } 
          }
        },
      },
      {
        $addFields: {
          estimatedTimeInMinutes: {
            $ceil: {
              $divide: [
                { $multiply: ["$distanceInKm", 60] },
                AVERAGE_SPEED_KMPH, // Define average speed constant, e.g., 30 km/h
              ],
            },
          },
        },
      },
    ]);
  }

  if (!geoNearResult.length) {
    throw new AppError(httpStatus.NOT_FOUND, "No mechanics found within 60km radius");
  }

  // Map the result to return mechanic details and ETA
  const result = geoNearResult.map((mechanic) => ({
    mechanicId: mechanic._id,
    mechanicName: mechanic.mechanicName || mechanic.name,  // Use mechanicName from service or fallback to name
    mechanicImage: mechanic.mechanicImage || mechanic.image || "", // Image from the UserModel or fallback to empty
    price: mechanic.price || 0, // Include the service price
    distance: mechanic.distanceInKm ? `${mechanic.distanceInKm.toFixed(2)} km` : "N/A", // Handle undefined distance
    eta: mechanic.estimatedTimeInMinutes ? `${mechanic.estimatedTimeInMinutes} mins` : "N/A", // Handle undefined ETA
    isFavourite: mechanic.isFavourite || false, // Include the favourite status
  }));

  // Return paginated data and pagination info
  return {
    pagination: paginationInfo,
    data: result,  // Return the filtered mechanics
  };
};














// export const getAllMechanicsWithSortingAndSearch = async ({
//   currentPage,
//   limit,
//   userId,
//   sortBy,
//   serviceName="",
// }: {
//   currentPage: number;  // Current page for pagination
//   limit: number;        // Number of records per page
//   userId: string;       // User ID to calculate distance from
//   sortBy: 'rating' | 'nearest'; // Sort by rating or nearest
//   serviceName?: string; // Optional: Filter by service name (partial match)
// }) => {
//   const AVERAGE_SPEED_KMPH = 30;

//   // Calculate the total number of mechanics
//   const totalData = await Mechanic.countDocuments();

//   // Use paginationBuilder to get pagination details
//   const paginationInfo = paginationBuilder({
//     totalData,
//     currentPage,
//     limit,
//   });

//   // Fetch user data to get the location for geospatial queries
//   const user = await UserModel.findById(userId);
//   if (!user || !user.location || !user.location.coordinates) {
//     throw new AppError(httpStatus.BAD_REQUEST, "User or location not found");
//   }

//   const userLocation = user.location.coordinates;

//   // Initialize query for mechanics based on user role 'mechanic'
//   let query = UserModel.find({ role: 'mechanic' }).select('name image location'); // Only get name, image, and location
  
//   // If serviceName is provided, filter mechanics by service name
//   if (serviceName) {
//     // Use regex for partial matching of service name
//     const serviceSearchQuery = { name: { $regex: serviceName, $options: 'i' } };  // Case-insensitive partial match
    
//     // Find services that match the partial service name
//     const services = await Service.find(serviceSearchQuery);  // Find services by the partial service name
//     if (!services.length) throw new Error("No services found with the given name");

//     const serviceIds = services.map(service => service._id);  // Extract service IDs

//     // Find mechanics offering the services that match the partial name
//     query = query.where('_id').in(
//       await MechanicServiceRateModel.find({
//         'services.service': { $in: serviceIds },  // Match mechanics offering the services
//       }).distinct('mechanic') // Get distinct mechanic IDs that match the services
//     );
//   }

//   // Apply sorting based on the provided sort criteria
//   if (sortBy === 'rating') {
//     // Sort by rating in descending order
//     query = query.sort({ rating: -1 });
//   } else if (sortBy === 'nearest') {
//     // Apply geospatial sorting to find nearest mechanics
//     query = query.where('location')
//       .near({
//         center: { type: 'Point', coordinates: userLocation },
//         spherical: true,  // Use spherical geometry for calculating distances
//         maxDistance: 10000,  // Optional: Set a maximum distance (e.g., 10 km)
//       });
//   }

//   // Query mechanics with pagination
//   const mechanics = await query
//     .skip((currentPage - 1) * limit) // Skip the previous pages for pagination
//     .limit(limit)                   // Limit the number of results
//     .populate('location')           // Populate the location field of the mechanics

//   // Return paginated data along with sorting information
//   return {
//     pagination: paginationInfo,
//     data: mechanics,
//   };
// };