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
  const mechanic = await Mechanic.findById(mechanicId);
  if (!mechanic) throw new Error("Mechanic not found");

  const result = await Mechanic.findByIdAndUpdate(mechanicId, { isAvailable: !mechanic.isAvailable }, { new: true });
  return result;
}

export const getSingleMechanicFromDB = async (mechanicId: string) => {
  const mechanic = await Mechanic.findById(mechanicId).populate('user');
  if (!mechanic) throw new Error("Mechanic not found");
  const serviceWithRate = await MechanicServiceRateModel.findOne({ mechanic: mechanic.user }).populate('services.service');
  return {mechanic, serviceWithRate };
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
export const getAllTestMechanicsFromDB = async ({
  currentPage,
  limit,
  userId,
  serviceName = "T" // New parameter for searching service by name
}: {
  currentPage: number;
  limit: number;
  userId: string;
  serviceName?: string; // Optional serviceName parameter
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

  let geoNearResult = [];

  if (serviceName) {
    console.log("Searching for mechanics with service name:", serviceName);
    
    // Step 1: Find mechanics who offer the service
    const mechanisWithService = await MechanicServiceRateModel.aggregate([
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
          "servicesDetails.name": { $regex: serviceName, $options: "i" }, // Match service name (case-insensitive)
        },
      },
    ]);

    // console.log("mechanicWith service",mechanisWithService);

    // Step 2: Get geoNear results for each mechanic
    const geoNearResults = await Promise.all(
      mechanisWithService.map(async (mechanic) => {
        mechanic.mechanic = mechanic.mechanic.toString();
        console.log(mechanic.mechanic);
        // Perform the geoNear aggregation for each mechanic
        const geoNearResult = await UserModel.aggregate([
          {
            $geoNear: {
              near: {
                type: "Point",
                coordinates: [user.location.coordinates[0], user.location.coordinates[1]],
              },
              key: "location", // Mechanic's location to calculate distance
              distanceField: "distanceInMeters",
              spherical: true,
            },
          },
          {
            $match: {
              role: "mechanic", // Only include mechanics
              _id: mechanic.mechanic, // Ensure we're looking up the correct mechanic
            },
          },
          {
            $project: {
              _id: 1,
              name: 1,
              image: 1,
              distanceInKm: { $divide: ["$distanceInMeters", 1000] }, // Calculate distance in km
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
        console.log("geoNearResult for mechanic:", geoNearResult);
        return geoNearResult; // Return the geoNearResult for this mechanic
      })
    );
    // console.log(geoNearResults);
    // Flatten the array of geoNearResults
    geoNearResult = geoNearResults.flat();

  } else {
    // If no serviceName is provided, default to get all mechanics in the area
    geoNearResult = await UserModel.aggregate([
      {
        $geoNear: {
          near: {
            type: "Point",
            coordinates: [user.location.coordinates[0], user.location.coordinates[1]],
          },
          key: "location",
          distanceField: "distanceInMeters",
          spherical: true,
        },
      },
      {
        $match: {
          role: "mechanic",
        },
      },
      {
        $project: {
          _id: 1,
          name: 1,
          image: 1,
          distanceInKm: { $divide: ["$distanceInMeters", 1000] }, // Calculate distance in km
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
    throw new AppError(httpStatus.NOT_FOUND, "No mechanics found nearby");
  }

  // Map the result to return mechanic details and ETA
  const result = geoNearResult.map((mechanic) => ({
    mechanicId: mechanic._id,
    mechanicName: mechanic.mechanicName || mechanic.name,  // Use mechanicName from service or fallback to name
    mechanicImage: mechanic.mechanicImage || mechanic.image || "", // Image from the UserModel or fallback to empty
    price: mechanic.price || 0, // Include the service price
    distance: mechanic.distanceInKm ? `${mechanic.distanceInKm.toFixed(2)} km` : "N/A", // Handle undefined distance
    eta: mechanic.estimatedTimeInMinutes ? `${mechanic.estimatedTimeInMinutes} mins` : "N/A", // Handle undefined ETA
  }));

  // Return paginated data and pagination info
  return {
    pagination: paginationInfo,
    data: result,  // Return the filtered mechanics
  };
};



// export const getAllTestMechanicsFromDB = async ({
//   currentPage,
//   limit,
//   userId,
//   serviceName = "Twoing" // New parameter for searching service by name
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

//   // If serviceName is provided, filter mechanics based on service
//   let geoNearResult = [];

//   if (serviceName) {
//     console.log("Searching for mechanics with service name:", serviceName);
//     // Search for mechanics based on serviceName
//     geoNearResult = await MechanicServiceRateModel.aggregate([
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
//       {
//         $lookup: {
//           from: "users", // Lookup the user collection to get the mechanic's user details
//           localField: "mechanic",
//           foreignField: "_id",
//           as: "userDetails",
//         },
//       },
//       {
//         $unwind: "$userDetails", // Unwind the user details
//       },
//       {
//         $project: {
//           _id: 1,
//           mechanicId: "$mechanic",
//           mechanicName: "$userDetails.name",
//           mechanicImage: "$userDetails.image",
//           serviceName: "$servicesDetails.name",
//           price: "$servicesDetails.price",
//         },
//       },
//     ]);
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
//         $project: {
//           _id: 1,
//           name: 1,
//           image: 1,
//           distanceInKm: { $divide: ["$distanceInMeters", 1000] },
//         },
//       },
//       {
//         $addFields: {
//           estimatedTimeInMinutes: {
//             $ceil: {
//               $divide: [
//                 { $multiply: ["$distanceInKm", 60] },
//                 AVERAGE_SPEED_KMPH,
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
//     mechanicName: mechanic.mechanicName,
//     mechanicImage: mechanic.mechanicImage || "", // Image from the UserModel
//     serviceName: mechanic.serviceName || "", // If searching by service, include the service name
//     price: mechanic.price || 0, // Include the service price
//     distance: `${mechanic.distanceInKm.toFixed(2)} km`,
//     eta: `${mechanic.estimatedTimeInMinutes} mins`,
//   }));

//   // Return paginated data and pagination info
//   return {
//     pagination: paginationInfo,
//     data: result,  // Return the filtered mechanics
//     test: result,  // Returning 'test' for consistency
//   };
// };




















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