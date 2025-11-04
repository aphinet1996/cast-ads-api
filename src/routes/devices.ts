// import { Router } from 'express';
// import { DeviceService } from '../services/device.service';
// import { validateDeviceRegistration } from '../middleware/validation';
// import { logError, createErrorResponse, toError } from '../utils/error-handler';

// const router = Router();

// // Helper function to generate request ID
// const generateRequestId = (): string => {
//   return Date.now().toString(36) + Math.random().toString(36).substr(2);
// };

// // GET /api/devices - Get all devices
// router.get('/', async (req, res) => {
//   console.log('[DEVICES] GET /api/devices - Fetching all devices');
//   try {
//     const devices = await DeviceService.getAllDevices();
//     console.log(`[DEVICES] Successfully fetched ${devices.length} devices`);
//     res.json({ success: true, data: devices });
//   } catch (error: unknown) {
//     logError('DEVICES', 'Fetch All Devices', error);
//     const errorResponse = createErrorResponse(error);
//     res.status(errorResponse.status).json(errorResponse.response);
//   }
// });

// // POST /api/devices/register - Register new device
// router.post('/register', validateDeviceRegistration, async (req, res) => {
//   const requestId = generateRequestId();
//   const context = { requestId, ip: req.ip };

//   try {
//     const deviceInfo = req.body;

//     // Register device
//     const device = await DeviceService.registerDevice(deviceInfo);

//     res.status(201).json({
//       success: true,
//       data: device,
//       message: 'Device registered successfully'
//     });

//   } catch (error: unknown) {
//     logError('DEVICE-REGISTER', 'Device Registration', error, context);
//     const errorResponse = createErrorResponse(error);
//     res.status(errorResponse.status).json(errorResponse.response);
//   }
// });

// // PUT /api/devices/:id - Update device information
// router.put('/:id', validateDeviceRegistration, async (req, res) => {
//   const requestId = generateRequestId();
//   const deviceId = req.params.id;
//   const context = { requestId, deviceId, ip: req.ip };

//   try {
//     const updateData = req.body;

//     // Check if device exists
//     const existingDevice = await DeviceService.getDeviceById(deviceId);
//     if (!existingDevice) {
//       console.warn(`[DEVICE-UPDATE-${requestId}] Device not found: ${deviceId}`);
//       return res.status(404).json({ success: false, error: 'Device not found' });
//     }

//     // Update device (use registerDevice with explicit deviceId)
//     const updatedDevice = await DeviceService.registerDevice({
//       deviceId: deviceId,
//       ...updateData
//     });

//     res.json({
//       success: true,
//       data: updatedDevice,
//       message: 'Device updated successfully'
//     });

//   } catch (error: unknown) {
//     logError('DEVICE-UPDATE', 'Device Update', error, context);
//     const errorResponse = createErrorResponse(error);
//     res.status(errorResponse.status).json(errorResponse.response);
//   }
// });

// // GET /api/devices/:id - Get device by ID
// router.get('/:id', async (req, res) => {
//   const deviceId = req.params.id;
//   const context = { deviceId };

//   try {
//     const device = await DeviceService.getDeviceById(deviceId);
//     if (!device) {
//       console.warn(`[DEVICES] Device not found: ${deviceId}`);
//       return res.status(404).json({ success: false, error: 'Device not found' });
//     }
//     res.json({ success: true, data: device });
//   } catch (error: unknown) {
//     logError('DEVICES', 'Get Device By ID', error, context);
//     const errorResponse = createErrorResponse(error);
//     res.status(errorResponse.status).json(errorResponse.response);
//   }
// });

// // GET /api/devices/search/:identifier - Get device by any identifier
// router.get('/search/:identifier', async (req, res) => {
//   const identifier = req.params.identifier;
//   const context = { identifier };

//   try {
//     const device = await DeviceService.getDeviceByIdentifier(identifier);
//     if (!device) {
//       console.warn(`[DEVICES] Device not found by identifier: ${identifier}`);
//       return res.status(404).json({ success: false, error: 'Device not found' });
//     }

//     res.json({ success: true, data: device });
//   } catch (error: unknown) {
//     logError('DEVICES', 'Search Device By Identifier', error, context);
//     const errorResponse = createErrorResponse(error);
//     res.status(errorResponse.status).json(errorResponse.response);
//   }
// });

// // GET /api/devices/capability/:capability - Get devices by capability
// router.get('/capability/:capability', async (req, res) => {
//   const capability = req.params.capability;
//   const context = { capability };

//   try {
//     const devices = await DeviceService.getDevicesByCapability(capability);

//     res.json({
//       success: true,
//       data: devices,
//       count: devices.length
//     });
//   } catch (error: unknown) {
//     logError('DEVICES', 'Get Devices By Capability', error, context);
//     const errorResponse = createErrorResponse(error);
//     res.status(errorResponse.status).json(errorResponse.response);
//   }
// });

// // DELETE /api/devices/:id - Remove device
// router.delete('/:id', async (req, res) => {
//   const deviceId = req.params.id;
//   const context = { deviceId };

//   console.log(`[DEVICES] DELETE /api/devices/${deviceId} - Removing device`);

//   try {
//     // Check if device exists before deleting
//     const existingDevice = await DeviceService.getDeviceById(deviceId);
//     if (!existingDevice) {
//       console.warn(`[DEVICES] Cannot delete - Device not found: ${deviceId}`);
//       return res.status(404).json({ success: false, error: 'Device not found' });
//     }

//     console.log(`[DEVICES] Deleting device: ${existingDevice.deviceName}`);
//     await DeviceService.removeDevice(deviceId);

//     console.log(`[DEVICES] ✅ Device removed successfully: ${deviceId}`);
//     res.json({ success: true, message: 'Device removed successfully' });
//   } catch (error: unknown) {
//     logError('DEVICES', 'Remove Device', error, context);
//     const errorResponse = createErrorResponse(error);
//     res.status(errorResponse.status).json(errorResponse.response);
//   }
// });

// // POST /api/devices/:id/status - Update device status
// router.post('/:id/status', async (req, res) => {
//   const deviceId = req.params.id;
//   const { status, socketId } = req.body;
//   const context = { deviceId, status, socketId };

//   console.log(`[DEVICES] POST /api/devices/${deviceId}/status - Updating device status`);
//   console.log(`[DEVICES] New status: ${status}, Socket ID: ${socketId || 'none'}`);

//   try {
//     // Validate status
//     if (!status || !['online', 'offline', 'busy'].includes(status)) {
//       return res.status(400).json({
//         success: false,
//         error: 'Invalid status. Must be: online, offline, or busy'
//       });
//     }

//     await DeviceService.updateDeviceStatus(deviceId, status, socketId);

//     console.log(`[DEVICES] ✅ Device status updated successfully`);
//     res.json({
//       success: true,
//       message: 'Device status updated successfully',
//       data: { deviceId, status, socketId }
//     });
//   } catch (error: unknown) {
//     logError('DEVICES', 'Update Device Status', error, context);
//     const errorResponse = createErrorResponse(error);
//     res.status(errorResponse.status).json(errorResponse.response);
//   }
// });

// // POST /api/devices/cleanup/offline - Mark stale devices as offline
// router.post('/cleanup/offline', async (req, res) => {
//   const { minutes = 5 } = req.body;
//   const context = { minutes };

//   try {
//     await DeviceService.markOfflineDevices(minutes);

//     res.json({
//       success: true,
//       message: `Stale devices marked as offline (threshold: ${minutes} minutes)`
//     });
//   } catch (error: unknown) {
//     logError('DEVICES', 'Cleanup Offline Devices', error, context);
//     const errorResponse = createErrorResponse(error);
//     res.status(errorResponse.status).json(errorResponse.response);
//   }
// });

// export const deviceRoutes = router;

import { Router } from 'express';
import { DeviceController } from '../controllers/device.controller';

const router = Router();

// Get all devices with optional filters
router.get('/', DeviceController.getAllDevices);

// Get device statistics
router.get('/stats', DeviceController.getDeviceStats);

// Get online devices
router.get('/online', DeviceController.getOnlineDevices);

// Get devices by capability
router.get('/capability/:capability', DeviceController.getDevicesByCapability);

// Register or update device
router.post('/register', DeviceController.registerDevice);

// Cleanup stale devices
router.post('/cleanup', DeviceController.cleanupStaleDevices);

// Update device name
router.patch('/:deviceId/name', DeviceController.updateDeviceName);

// Get device by identifier (deviceId, uniqueId, or serialNumber)
router.get('/:identifier', DeviceController.getDeviceByIdentifier);

// Update device status
router.put('/:deviceId/status', DeviceController.updateDeviceStatus);

// Device heartbeat
router.put('/:deviceId/heartbeat', DeviceController.deviceHeartbeat);

// Delete device
router.delete('/:deviceId', DeviceController.deleteDevice);

export default router;