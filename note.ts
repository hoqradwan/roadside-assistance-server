// Haversine formula to calculate distance between two coordinates
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // Distance in kilometers
};

// Interface for user location data
interface UserLocation {
  userId: string;
  userType: 'user' | 'mechanic';
  latitude: number;
  longitude: number;
  lastUpdated: number;
  isOnline: boolean;
}

// Interface for distance calculation result
interface DistanceResult {
  mechanicId: string;
  userId: string;
  distance: number;
  mechanicLocation: { lat: number; lng: number };
  userLocation: { lat: number; lng: number };
  lastCalculated: number;
}

const initSocketIO = (server: HttpServer) => {
  io = new Server(server, {
    cors: {
      origin: "*", // Adjust according to your needs
      methods: ["GET", "POST"]
    }
  });

  // Map to track online users (userId -> socketId)
  const onlineUsers = new Map<string, string>();
  
  // Map to track user locations (userId -> UserLocation)
  const userLocations = new Map<string, UserLocation>();
  
  // Map to track location buffers per user (userId -> locationBuffer)
  const userLocationBuffers = new Map<string, {
    buffer: Array<{ longitude: number; latitude: number; timestamp: number }>;
    lastUpdateTime: number;
  }>();

  // Map to track distance calculations (mechanicId-userId -> DistanceResult)
  const distanceCache = new Map<string, DistanceResult>();

  const LOCATION_LIMIT = 30;
  const UPDATE_INTERVAL = 30 * 1000; // 30 seconds
  const DISTANCE_UPDATE_INTERVAL = 10 * 1000; // Update distances every 10 seconds
  const MAX_PROXIMITY_DISTANCE = 50; // km - only calculate distances within this range

  let userData: any;

  // Function to calculate and broadcast distances
  const calculateAndBroadcastDistances = () => {
    const mechanics = Array.from(userLocations.values()).filter(user => 
      user.userType === 'mechanic' && user.isOnline
    );
    const users = Array.from(userLocations.values()).filter(user => 
      user.userType === 'user' && user.isOnline
    );

    const currentTime = Date.now();
    const distanceUpdates: DistanceResult[] = [];

    mechanics.forEach(mechanic => {
      users.forEach(user => {
        const distance = calculateDistance(
          mechanic.latitude, mechanic.longitude,
          user.latitude, user.longitude
        );

        // Only process if within proximity range
        if (distance <= MAX_PROXIMITY_DISTANCE) {
          const cacheKey = `${mechanic.userId}-${user.userId}`;
          const existingDistance = distanceCache.get(cacheKey);

          // Update if distance changed significantly (>100m) or cache is old
          const distanceChanged = !existingDistance || 
            Math.abs(existingDistance.distance - distance) > 0.1 || 
            (currentTime - existingDistance.lastCalculated) > DISTANCE_UPDATE_INTERVAL;

          if (distanceChanged) {
            const distanceResult: DistanceResult = {
              mechanicId: mechanic.userId,
              userId: user.userId,
              distance: Math.round(distance * 100) / 100, // Round to 2 decimal places
              mechanicLocation: { lat: mechanic.latitude, lng: mechanic.longitude },
              userLocation: { lat: user.latitude, lng: user.longitude },
              lastCalculated: currentTime
            };

            distanceCache.set(cacheKey, distanceResult);
            distanceUpdates.push(distanceResult);

            // Emit to both mechanic and user
            const mechanicSocketId = onlineUsers.get(mechanic.userId);
            const userSocketId = onlineUsers.get(user.userId);

            if (mechanicSocketId) {
              io.to(mechanicSocketId).emit('distance-update', {
                targetUserId: user.userId,
                targetUserType: 'user',
                distance: distanceResult.distance,
                targetLocation: distanceResult.userLocation
              });
            }

            if (userSocketId) {
              io.to(userSocketId).emit('distance-update', {
                targetUserId: mechanic.userId,
                targetUserType: 'mechanic',
                distance: distanceResult.distance,
                targetLocation: distanceResult.mechanicLocation
              });
            }
          }
        } else {
          // Remove from cache if too far
          const cacheKey = `${mechanic.userId}-${user.userId}`;
          distanceCache.delete(cacheKey);
        }
      });
    });

    // Broadcast nearby mechanics to users and vice versa
    if (distanceUpdates.length > 0) {
      console.log(`Updated ${distanceUpdates.length} distance calculations`);
    }
  };

  // Set up periodic distance calculation
  const distanceCalculationInterval = setInterval(calculateAndBroadcastDistances, DISTANCE_UPDATE_INTERVAL);

  io.on('connection', async (socket: Socket) => {

    logger.info(colors.blue(`🔌🟢 New connection: ${socket.id}`));

    const token = socket.handshake.headers.token || socket.handshake.headers.authorization;

    if (!token) {
      logger.error(colors.red('No token provided'));
      socket.emit('error', 'Unauthorized');
      socket.disconnect();
      return;
    }

    userData = getUserData(token as string);

    if (!userData) {
      logger.error(colors.red('Invalid token'));
      socket.emit('error', 'Unauthorized');
      socket.disconnect();
      return;
    }

    // Handle user authentication/connection
    socket.on('user-connect', (userType: 'user' | 'mechanic' = 'user') => {
      const userId = userData?.id;
      if (!userId) {
        logger.error(colors.red('User ID not found'));
        socket.emit('error', 'Unauthorized');
        socket.disconnect();
        return;
      }

      socket.userId = userId;
      socket.userType = userType;
      onlineUsers.set(userId, socket.id);
      socket.join(userId);

      // Initialize location buffer for this user
      if (!userLocationBuffers.has(userId)) {
        userLocationBuffers.set(userId, {
          buffer: [],
          lastUpdateTime: Date.now()
        });
      }

      // Update user location status
      const existingLocation = userLocations.get(userId);
      if (existingLocation) {
        existingLocation.isOnline = true;
        existingLocation.userType = userType;
      }

      logger.info(colors.green(`${userType} ${userId} authenticated and connected`));
      
      // Send confirmation with user type
      socket.emit('user-connected', { userId, userType });
    });

    // Handle request for nearby mechanics/users
    socket.on('get-nearby', (radius: number = 10) => {
      const userId = userData?.id;
      if (!userId) {
        socket.emit('error', 'Unauthorized');
        return;
      }

      const userLocation = userLocations.get(userId);
      if (!userLocation) {
        socket.emit('nearby-results', []);
        return;
      }

      const targetType = userLocation.userType === 'mechanic' ? 'user' : 'mechanic';
      const nearbyUsers: Array<UserLocation & { distance: number }> = [];

      userLocations.forEach((location, locationUserId) => {
        if (locationUserId !== userId && 
            location.userType === targetType && 
            location.isOnline) {
          
          const distance = calculateDistance(
            userLocation.latitude, userLocation.longitude,
            location.latitude, location.longitude
          );

          if (distance <= radius) {
            nearbyUsers.push({
              ...location,
              distance: Math.round(distance * 100) / 100
            });
          }
        }
      });

      // Sort by distance
      nearbyUsers.sort((a, b) => a.distance - b.distance);

      socket.emit('nearby-results', nearbyUsers);
    });

    // Handle private messages
    socket.on('send-message', async ({ to, message }: { to: string; message: string }) => {
      if (!userData?.id) {
        socket.emit('error', 'Unauthorized');
        return;
      }

      // Input validation
      if (!to || !message || typeof message !== 'string' || message.trim().length === 0) {
        socket.emit('error', 'Invalid message data');
        return;
      }

      try {
        const messageResult = await ChatMessage.create({
          sender: userData.id,
          receiver: to,
          message: message.trim(),
          timestamp: new Date()
        });

        // Emit to recipient if online
        if (onlineUsers.has(to)) {
          io.to(to).emit('private-message', messageResult);
        }

        // Send confirmation back to sender
        socket.emit('message-sent', messageResult);

      } catch (error) {
        logger.error(colors.red(`Error sending message: ${error}`));
        socket.emit('error', 'Failed to send message');
      }
    });

    socket.on("client_location", async (data, callback) => {
      try {
        const { lng, lat, user } = data;
        
        // Input validation
        if (!lng || !lat || !user || typeof lng !== 'number' || typeof lat !== 'number') {
          socket.emit('error', 'Invalid location data');
          return;
        }

        // Validate coordinate ranges
        if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
          socket.emit('error', 'Invalid coordinate values');
          return;
        }

        // Ensure user is authorized to update this location
        if (userData?.id !== user) {
          socket.emit('error', 'Unauthorized location update');
          return;
        }

        const longitude = Number(lng);
        const latitude = Number(lat);
        const userId = user;
        
        console.log(`Location received: ${latitude}, ${longitude} for ${socket.userType || 'user'} ${userId}`);

        // Update real-time location tracking
        userLocations.set(userId, {
          userId,
          userType: socket.userType || 'user',
          latitude,
          longitude,
          lastUpdated: Date.now(),
          isOnline: true
        });

        // Get or create user's location buffer
        let userLocationData = userLocationBuffers.get(userId);
        if (!userLocationData) {
          userLocationData = {
            buffer: [],
            lastUpdateTime: Date.now()
          };
          userLocationBuffers.set(userId, userLocationData);
        }

        // Add location to buffer with timestamp
        userLocationData.buffer.push({ 
          longitude, 
          latitude, 
          timestamp: Date.now() 
        });

        // Check if we should update the database
        if (userLocationData.buffer.length >= LOCATION_LIMIT) {
          const currentTime = Date.now();
          const timeElapsed = currentTime - userLocationData.lastUpdateTime;

          if (timeElapsed >= UPDATE_INTERVAL) {
            try {
              // Use the most recent location
              const lastLocation = userLocationData.buffer[userLocationData.buffer.length - 1];

              const result = await UserModel.findByIdAndUpdate(
                userId,
                { 
                  $set: { 
                    "location.coordinates": [lastLocation.longitude, lastLocation.latitude],
                    "location.lastUpdated": new Date()
                  } 
                },
                { new: true }
              );

              if (result) {
                console.log("Database updated with location:", lastLocation);
                
                // Send confirmation back to client
                if (callback && typeof callback === 'function') {
                  callback({ success: true, message: 'Location updated successfully' });
                }
              } else {
                console.error("User not found for location update");
                socket.emit('error', 'User not found');
              }

              // Clear buffer and update timestamp
              userLocationData.buffer = [];
              userLocationData.lastUpdateTime = currentTime;

            } catch (error) {
              console.error("Error updating location in database:", error);
              socket.emit('error', 'Failed to update location');
              
              if (callback && typeof callback === 'function') {
                callback({ success: false, message: 'Failed to update location' });
              }
            }
          }
        }

        // Trigger immediate distance calculation for this user
        setTimeout(() => {
          const userLocation = userLocations.get(userId);
          if (userLocation) {
            const targetType = userLocation.userType === 'mechanic' ? 'user' : 'mechanic';
            const nearbyTargets = Array.from(userLocations.values()).filter(loc => 
              loc.userType === targetType && 
              loc.isOnline && 
              loc.userId !== userId
            );

            nearbyTargets.forEach(target => {
              const distance = calculateDistance(
                userLocation.latitude, userLocation.longitude,
                target.latitude, target.longitude
              );

              if (distance <= MAX_PROXIMITY_DISTANCE) {
                const targetSocketId = onlineUsers.get(target.userId);
                
                // Notify the target about this user's updated location
                if (targetSocketId) {
                  io.to(targetSocketId).emit('distance-update', {
                    targetUserId: userId,
                    targetUserType: userLocation.userType,
                    distance: Math.round(distance * 100) / 100,
                    targetLocation: { lat: latitude, lng: longitude }
                  });
                }

                // Notify this user about the target
                socket.emit('distance-update', {
                  targetUserId: target.userId,
                  targetUserType: target.userType,
                  distance: Math.round(distance * 100) / 100,
                  targetLocation: { lat: target.latitude, lng: target.longitude }
                });
              }
            });
          }
        }, 100); // Small delay to ensure location is properly updated

      } catch (error) {
        console.error("Error processing location data:", error);
        socket.emit('error', 'Invalid location data format');
      }
    });

    // Handle emergency/priority requests
    socket.on('emergency-request', (data) => {
      const userId = userData?.id;
      const userLocation = userLocations.get(userId);
      
      if (!userLocation) {
        socket.emit('error', 'Location not available');
        return;
      }

      // Find nearby mechanics within 20km for emergency
      const nearbyMechanics = Array.from(userLocations.values())
        .filter(loc => loc.userType === 'mechanic' && loc.isOnline)
        .map(mechanic => ({
          ...mechanic,
          distance: calculateDistance(
            userLocation.latitude, userLocation.longitude,
            mechanic.latitude, mechanic.longitude
          )
        }))
        .filter(mechanic => mechanic.distance <= 20)
        .sort((a, b) => a.distance - b.distance);

      // Notify nearby mechanics about emergency
      nearbyMechanics.forEach(mechanic => {
        const mechanicSocketId = onlineUsers.get(mechanic.userId);
        if (mechanicSocketId) {
          io.to(mechanicSocketId).emit('emergency-alert', {
            userId,
            userLocation: { lat: userLocation.latitude, lng: userLocation.longitude },
            distance: mechanic.distance,
            message: data.message || 'Emergency assistance needed',
            timestamp: Date.now()
          });
        }
      });

      socket.emit('emergency-sent', {
        notifiedMechanics: nearbyMechanics.length,
        nearestDistance: nearbyMechanics[0]?.distance || null
      });
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      if (socket.userId) {
        onlineUsers.delete(socket.userId);
        
        // Update location status to offline
        const userLocation = userLocations.get(socket.userId);
        if (userLocation) {
          userLocation.isOnline = false;
        }
        
        // Clean up distance cache entries for this user
        const keysToDelete = Array.from(distanceCache.keys()).filter(key => 
          key.includes(socket.userId)
        );
        keysToDelete.forEach(key => distanceCache.delete(key));
        
        // Optionally clean up location buffer after some time
        setTimeout(() => {
          if (!onlineUsers.has(socket.userId)) {
            userLocationBuffers.delete(socket.userId);
            userLocations.delete(socket.userId);
          }
        }, 5 * 60 * 1000); // Clean up after 5 minutes
        
        logger.info(colors.yellow(`${socket.userType || 'User'} ${socket.userId} disconnected`));
      }
    });

    // Handle connection errors
    socket.on('error', (error) => {
      logger.error(colors.red(`Socket error for ${socket.id}: ${error}`));
    });
  });

  // Clean up interval on server shutdown
  process.on('SIGTERM', () => {
    clearInterval(distanceCalculationInterval);
  });

  logger.info(colors.green('Socket.IO initialized for real-time location tracking and distance calculation'));
};

export { initSocketIO };