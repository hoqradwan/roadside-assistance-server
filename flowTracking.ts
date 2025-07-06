/* # Location Tracking System - Complete Testing Flow

## System Overview
Your location tracking system handles real-time tracking between users and mechanics with the following key components:
- **REST API endpoints** for tracking operations
- **Socket.IO** for real-time updates
- **Event emitters** for system events
- **Database operations** for persistence

## Complete Testing Flow

### 1. Initial Setup & Prerequisites
```bash
# Ensure you have test users and mechanics in your database
# User ID: user123
# Mechanic ID: mechanic456
# Order ID: order789
```

### 2. Phase 1: Initialize Tracking
**API Call:**
```http
POST /api/tracking/initialize/:mechanicId
Authorization: Bearer <user_token>
Body: {
  "orderId": "order789"
}
```

**Expected Results:**
- ✅ Tracking record created in database
- ✅ Initial distance calculated
- ✅ ETA estimated
- ✅ Event emitted: `trackingInitialized`
- ✅ Status set to 'pending'

### 3. Phase 2: Socket Connection Setup
**Client-side Socket Events:**
```javascript
// User connects and joins rooms
socket.emit('joinServiceRoom', 'order789');
socket.emit('joinUserRoom', 'user123');

// Mechanic connects and joins rooms
socket.emit('joinServiceRoom', 'order789');
socket.emit('joinMechanicRoom', 'mechanic456');
```

**Expected Results:**
- ✅ Sockets joined respective rooms
- ✅ Console logs show successful room joins

### 4. Phase 3: Real-time Location Updates

#### 4.1 Mechanic Location Updates
**Method A: Via Socket**
```javascript
socket.emit('updateLocation', {
  orderId: 'order789',
  userType: 'mechanic',
  userId: 'mechanic456',
  longitude: 90.4125,
  latitude: 23.8103
});
```

**Method B: Via API**
```http
PUT /api/tracking/mechanic/:mechanicId
Body: {
  "orderId": "order789",
  "lng": 90.4125,
  "lat": 23.8103
}
```

#### 4.2 User Location Updates
**Method A: Via Socket**
```javascript
socket.emit('updateLocation', {
  orderId: 'order789',
  userType: 'user',
  userId: 'user123',
  longitude: 90.4130,
  latitude: 23.8108
});
```

**Method B: Via API**
```http
PUT /api/tracking/user/:userId
Body: {
  "orderId": "order789",
  "lng": 90.4130,
  "lat": 23.8108
}
```

**Expected Results for Each Update:**
- ✅ Database record updated
- ✅ Distance recalculated
- ✅ ETA updated
- ✅ Tracking history populated
- ✅ Real-time events emitted to all connected clients
- ✅ Status changes when mechanic arrives (≤100m)

### 5. Phase 4: Event Verification
**Listen for these events on client:**
```javascript
// Location updates
socket.on('locationUpdate', (data) => {
  console.log('Location updated:', data);
});

// Mechanic arrival
socket.on('mechanicArrived', (data) => {
  console.log('Mechanic arrived:', data);
});

// Tracking completion
socket.on('trackingCompleted', (data) => {
  console.log('Tracking completed:', data);
});
```

### 6. Phase 5: Complete/Cancel Tracking
**Complete Tracking:**
```http
PUT /api/tracking/complete/:orderId
```

**Cancel Tracking:**
```http
PUT /api/tracking/cancel/:orderId
```

## Testing Tools & Setup

### 1. API Testing (Postman/Thunder Client)
```json
{
  "name": "Location Tracking Tests",
  "requests": [
    {
      "name": "Initialize Tracking",
      "method": "POST",
      "url": "{{base_url}}/api/tracking/initialize/mechanic456",
      "headers": {
        "Authorization": "Bearer {{user_token}}"
      },
      "body": {
        "orderId": "order789"
      }
    }
  ]
}
```

### 2. Socket.IO Testing (Frontend/Postman)
```javascript
// Simple HTML test client
const socket = io('http://localhost:3000');

// Test connection
socket.on('connect', () => {
  console.log('Connected:', socket.id);
  
  // Join rooms
  socket.emit('joinServiceRoom', 'order789');
  socket.emit('joinUserRoom', 'user123');
});

// Listen for events
socket.on('locationUpdate', console.log);
socket.on('mechanicArrived', console.log);
```

### 3. Database Verification Queries
```javascript
// Check tracking record
db.distancetrackings.findOne({orderId: "order789"});

// Check tracking history
db.distancetrackings.findOne(
  {orderId: "order789"}, 
  {trackingHistory: 1}
);
```

## Issues Found in Your Code

### 1. Controller Bug
```javascript
// Current (incorrect):
export const initializeTracking = catchAsync(async(req:CustomRequest, res:Response)=>{
    const orderId = req.body; // This should be req.body.orderId
    // ...
})

// Should be:
export const initializeTracking = catchAsync(async(req:CustomRequest, res:Response)=>{
    const {orderId} = req.body;
    // ...
})
```

### 2. Socket Event Typo
```javascript
// Current (has typo):
io?.to(`user-${data.userId}`).emit('locatio?nUpdate', data);

// Should be:
io?.to(`user-${data.userId}`).emit('locationUpdate', data);
```

## Complete Test Scenario

### Scenario: User Requests Service, Mechanic Arrives
1. **Initialize** → User books service, tracking starts
2. **Mechanic moves** → Updates location every 30 seconds
3. **User moves** → Updates location (optional)
4. **Mechanic arrives** → Within 100m, status changes to 'arrived'
5. **Service complete** → Tracking ends

### Test Data
```javascript
const testData = {
  orderId: "order789",
  userId: "user123",
  mechanicId: "mechanic456",
  userLocation: { lng: 90.4130, lat: 23.8108 },
  mechanicLocation: { lng: 90.4125, lat: 23.8103 },
  arrivalLocation: { lng: 90.4129, lat: 23.8107 } // Within 100m
};
```

## Testing Checklist

### Database Operations
- [ ] Tracking record created
- [ ] Locations updated correctly
- [ ] Distance calculations accurate
- [ ] ETA calculations reasonable
- [ ] Status transitions work
- [ ] History tracking populated

### Real-time Features
- [ ] Socket connections established
- [ ] Room joins successful
- [ ] Events emitted correctly
- [ ] All clients receive updates
- [ ] No duplicate events

### Edge Cases
- [ ] Invalid order IDs
- [ ] Non-existent users/mechanics
- [ ] Concurrent location updates
- [ ] Network disconnections
- [ ] Arrival detection accuracy

### Performance
- [ ] Real-time updates under 1 second
- [ ] Database queries optimized
- [ ] Memory usage reasonable
- [ ] No memory leaks in long sessions

Use this comprehensive flow to test all aspects of your location tracking system systematically! */