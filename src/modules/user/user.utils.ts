// // import axios from "axios";

// import httpStatus from "http-status";
// import AppError from "../../errors/AppError";
// import { IUser } from "./user.interface";

// // const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || "";

// // interface Location {
// //   lat: number;
// //   lng: number;
// // }

// // export const getDistanceFromGoogleMaps = async (
// //   origin: Location,
// //   destination: Location
// // ) => {
// //   if (!GOOGLE_MAPS_API_KEY) {
// //     throw new Error("Google Maps API key is missing");
// //   }

// //   const originStr = `${origin.lat},${origin.lng}`;
// //   const destinationStr = `${destination.lat},${destination.lng}`;

// //   try {
// //     const response = await axios.get(
// //       `https://maps.googleapis.com/maps/api/distancematrix/json`,
// //       {
// //         params: {
// //           origins: originStr,
// //           destinations: destinationStr,
// //           units: "metric",
// //           key: GOOGLE_MAPS_API_KEY,
// //         },
// //       }
// //     );

// //     const data = response.data;
// //     console.log("Google Maps API Response:", JSON.stringify(data, null, 2));

// //     const element = data?.rows?.[0]?.elements?.[0];

// //     if (!element || element.status !== "OK") {
// //       throw new Error(`Google Maps error: ${element?.status || "Unknown error"}`);
// //     }

// //     return {
// //       distanceText: element.distance.text,
// //       durationText: element.duration.text,
// //       distanceValue: element.distance.value,
// //       durationValue: element.duration.value,
// //     };
// //   } catch (error: any) {
// //     // console.error("Google Maps Distance API Error:", error.message);
// //     throw new Error(
// //       error?.response?.data?.error_message ||
// //         error.message ||
// //         "Failed to get distance from Google Maps"
// //     );
// //   }
// // };


// // const getNearestGuides = async (userId: string, projects?: {}) => {
// //     try {
// //     // 1️⃣ Check if the seeker exists
// //     const seeker = await User.findById(userId);
// //     if (!seeker) {
// //     throw new AppError(httpStatus.NOT_FOUND, 'Seeker not found');
// //     }
// //     // 2️⃣ Extract location & interests
// //     const { location, interests } = seeker;
// //     if (
// //     !location ||
// //     !location.coordinates ||
// //     location.coordinates.length !== 2
// //     ) {
// //     throw new AppError(
// //     httpStatus.BAD_REQUEST,
// //     'Seeker location is missing or invalid',
// //     );
// //     }
// //     const [longitude, latitude] = location.coordinates;
// //     // ✅ Safe handling of `interests` to prevent `undefined` error
// //     const seekerInterestsArray =
// //     Array.isArray(interests) && interests.length > 0 ? interests : [];
// //     console.log('==== Seeker Location & Interests ===', {
// //     longitude,
// //     latitude,
// //     seekerInterestsArray,
// //     });
// //     // 3️⃣ Find guides who have been booked by this seeker with status NOT 'done' or 'cancelled'
// //     const activeBookings = await Booking.find({
// //     user_id: userId,
// //     status: { $nin: ['done', 'cancelled'] }, // Exclude 'done' & 'cancelled' bookings
// //     }).distinct('guide_id'); // Get unique guide IDs
    
// //     console.log({activeBookings})
// //     // 3️⃣ Query nearest guides
// //     const guides = await User.aggregate([
// //     {
// //     $geoNear: {
// //     near: {
// //     type: 'Point',
// //     coordinates: [longitude, latitude],
// //     },
// //     // key: "location",
// //     distanceField: 'distance',
// //     maxDistance: 5000, // ✅ 5km max distance filter
// //     spherical: true,
// //     },
// //     },
// //     {
// //     $match: {
// //     role: 'guide', // ✅ Only guides
// //     isActive: true,
// //     isDeleted: false,
// //     isBlocked: false,
// //     adminVerified: true,
// //     _id: { $nin: activeBookings },
// //     ...(seekerInterestsArray.length > 0 && {
// //     interests: { $in: seekerInterestsArray },
// //     }), // ✅ Filter by shared interests
// //     },
// //     },
// //     {
// //     $sort: { rating: -1 }, // ✅ Sort by highest rating
// //     },
// //     {
// //     $addFields: {
// //     type: 'user', // ✅ Add `type: user` to each document
// //     },
// //     },
// //     {
// //     $project: projects || {
// //     image: 1,
// //     fullName: 1,
// //     email: 1,
// //     phone: 1,
// //     location: 1,
// //     address: 1,
// //     about: 1,
// //     rating: 1,
// //     interests: 1,
// //     distance: 1, // ✅ Return distance in meters
// //     photos: 1,
// //     adminVerified: 1,
// //     myFee: 1,
// //     },
// //     },
// //     ]);
// //     return guides;
// //     } catch (error) {
// //     console.error('Error fetching nearest guides:', error);
// //     // ✅ Ensure error is properly typed before accessing `message`
// //     const errorMessage =
// //     error instanceof Error ? error.message : 'An unknown error occurred';
// //     throw new AppError(httpStatus.INTERNAL_SERVER_ERROR, errorMessage);
// //     }
// //     };
// import { getDistanceFromGoogleMaps } from '../utils/googleMaps'; // or wherever it's located
// import { UserModel } from "./user.model";

// const getNearestGuides = async (userId: string, projects?: {}) => {
//   try {
//     const seeker = await UserModel.findById(userId);
//     if (!seeker) {
//       throw new AppError(httpStatus.NOT_FOUND, 'Seeker not found');
//     }

//     const { location, interests } = seeker;
//     if (
//       !location ||
//       !location.coordinates ||
//       location.coordinates.length !== 2
//     ) {
//       throw new AppError(
//         httpStatus.BAD_REQUEST,
//         'Seeker location is missing or invalid',
//       );
//     }

//     const [longitude, latitude] = location.coordinates;
//     const seekerInterestsArray =
//       Array.isArray(interests) && interests.length > 0 ? interests : [];

//     const activeBookings = await Booking.find({
//       user_id: userId,
//       status: { $nin: ['done', 'cancelled'] },
//     }).distinct('guide_id');

//     const guides = await UserModel.aggregate([
//       {
//         $geoNear: {
//           near: {
//             type: 'Point',
//             coordinates: [longitude, latitude],
//           },
//           distanceField: 'distance',
//           maxDistance: 5000,
//           spherical: true,
//         },
//       },
//       {
//         $match: {
//           role: 'guide',
//           isActive: true,
//           isDeleted: false,
//           isBlocked: false,
//           adminVerified: true,
//           _id: { $nin: activeBookings },
//           ...(seekerInterestsArray.length > 0 && {
//             interests: { $in: seekerInterestsArray },
//           }),
//         },
//       },
//       {
//         $sort: { rating: -1 },
//       },
//       {
//         $addFields: {
//           type: 'user',
//         },
//       },
//       {
//         $project: projects || {
//           image: 1,
//           fullName: 1,
//           email: 1,
//           phone: 1,
//           location: 1,
//           address: 1,
//           about: 1,
//           rating: 1,
//           interests: 1,
//           distance: 1,
//           photos: 1,
//           adminVerified: 1,
//           myFee: 1,
//         },
//       },
//     ]);

//     // 🔁 Add Estimated Time Using Google Maps
//     const seekerLocation = {
//       lat: latitude,
//       lng: longitude,
//     };

//     const guidesWithTime = await Promise.all(
//       guides.map(async (guide) => {
//         const guideLocation = {
//           lat: guide.location.coordinates[1],
//           lng: guide.location.coordinates[0],
//         };

//         try {
//           const { durationText } = await getDistanceFromGoogleMaps(
//             seekerLocation,
//             guideLocation
//           );
//           return {
//             ...guide,
//             estimatedTime: durationText, // 🕒 Add travel time (e.g., "12 mins")
//           };
//         } catch (err) {
//           console.warn(`Failed to get ETA for guide ${guide._id}:`, err.message);
//           return {
//             ...guide,
//             estimatedTime: null, // fallback if API call fails
//           };
//         }
//       })
//     );

//     return guidesWithTime;
//   } catch (error) {
//     console.error('Error fetching nearest guides:', error);
//     const errorMessage =
//       error instanceof Error ? error.message : 'An unknown error occurred';
//     throw new AppError(httpStatus.INTERNAL_SERVER_ERROR, errorMessage);
//   }
// };
