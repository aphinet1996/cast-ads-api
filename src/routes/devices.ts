// import { Router } from 'express';
// import { DeviceService } from '../services/device.service';
// import { validateDeviceRegistration } from '../middleware/validation';

// const router = Router();

// // GET /api/devices - Get all devices
// router.get('/', async (req, res) => {
//   try {
//     const devices = await DeviceService.getAllDevices();
//     res.json({ success: true, data: devices });
//   } catch (error) {
//     console.error('Error fetching devices:', error);
//     res.status(500).json({ success: false, error: 'Internal server error' });
//   }
// });

// // POST /api/devices/register - Register new device (เพิ่มใหม่)
// router.post('/register', validateDeviceRegistration, async (req, res) => {
//   try {
//     const deviceInfo = req.body;
    
//     // Register device
//     const device = await DeviceService.registerDevice(deviceInfo);
    
//     res.status(201).json({ 
//       success: true, 
//       data: device,
//       message: 'Device registered successfully' 
//     });
//   } catch (error) {
//     console.error('Error registering device:', error);
//     res.status(500).json({ success: false, error: 'Internal server error' });
//   }
// });

// // PUT /api/devices/:id - Update device information (เพิ่มใหม่)
// router.put('/:id', validateDeviceRegistration, async (req, res) => {
//   try {
//     const { id } = req.params;
//     const updateData = req.body;
    
//     // Check if device exists
//     const existingDevice = await DeviceService.getDeviceById(id);
//     if (!existingDevice) {
//       return res.status(404).json({ success: false, error: 'Device not found' });
//     }
    
//     // Update device
//     const updatedDevice = await DeviceService.registerDevice({
//       deviceId: id,
//       ...updateData
//     });
    
//     res.json({ 
//       success: true, 
//       data: updatedDevice,
//       message: 'Device updated successfully' 
//     });
//   } catch (error) {
//     console.error('Error updating device:', error);
//     res.status(500).json({ success: false, error: 'Internal server error' });
//   }
// });

// // GET /api/devices/:id - Get device by ID
// router.get('/:id', async (req, res) => {
//   try {
//     const device = await DeviceService.getDeviceById(req.params.id);
//     if (!device) {
//       return res.status(404).json({ success: false, error: 'Device not found' });
//     }
//     res.json({ success: true, data: device });
//   } catch (error) {
//     console.error('Error fetching device:', error);
//     res.status(500).json({ success: false, error: 'Internal server error' });
//   }
// });

// // DELETE /api/devices/:id - Remove device
// router.delete('/:id', async (req, res) => {
//   try {
//     await DeviceService.removeDevice(req.params.id);
//     res.json({ success: true, message: 'Device removed successfully' });
//   } catch (error) {
//     console.error('Error removing device:', error);
//     res.status(500).json({ success: false, error: 'Internal server error' });
//   }
// });

// export const deviceRoutes = router;

import { Router } from 'express';
import { DeviceService } from '../services/device.service';
import { validateDeviceRegistration } from '../middleware/validation';
import { logError, createErrorResponse, toError } from '../utils/error-handler';

const router = Router();

// Helper function to generate request ID
const generateRequestId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

// GET /api/devices - Get all devices
router.get('/', async (req, res) => {
  console.log('[DEVICES] GET /api/devices - Fetching all devices');
  try {
    const devices = await DeviceService.getAllDevices();
    console.log(`[DEVICES] Successfully fetched ${devices.length} devices`);
    res.json({ success: true, data: devices });
  } catch (error: unknown) {
    logError('DEVICES', 'Fetch All Devices', error);
    const errorResponse = createErrorResponse(error);
    res.status(errorResponse.status).json(errorResponse.response);
  }
});

// POST /api/devices/register - Register new device
router.post('/register', validateDeviceRegistration, async (req, res) => {
  const requestId = generateRequestId();
  const context = { requestId, ip: req.ip };
  
  console.log(`[DEVICE-REGISTER-${requestId}] === Starting device registration ===`);
  console.log(`[DEVICE-REGISTER-${requestId}] Request IP: ${req.ip}`);
  console.log(`[DEVICE-REGISTER-${requestId}] Validated request body:`, JSON.stringify(req.body, null, 2));
  
  try {
    const deviceInfo = req.body;
    
    console.log(`[DEVICE-REGISTER-${requestId}] Device registration details:`);
    console.log(`[DEVICE-REGISTER-${requestId}] - Device ID: ${deviceInfo.deviceId || 'auto-generate'}`);
    console.log(`[DEVICE-REGISTER-${requestId}] - Unique ID: ${deviceInfo.uniqueId || 'not provided'}`);
    console.log(`[DEVICE-REGISTER-${requestId}] - Serial Number: ${deviceInfo.serialNumber || 'not provided'}`);
    // console.log(`[DEVICE-REGISTER-${requestId}] - Name: ${deviceInfo.name}`);
    console.log(`[DEVICE-REGISTER-${requestId}] - IP Address: ${deviceInfo.ipAddress}`);
    console.log(`[DEVICE-REGISTER-${requestId}] - Port: ${deviceInfo.port || 3001}`);
    console.log(`[DEVICE-REGISTER-${requestId}] - Device OS: ${deviceInfo.deviceOS || 'not provided'}`);
    console.log(`[DEVICE-REGISTER-${requestId}] - Device Name: ${deviceInfo.deviceName || 'not provided'}`);
    console.log(`[DEVICE-REGISTER-${requestId}] - Model Name: ${deviceInfo.modelName || 'not provided'}`);
    console.log(`[DEVICE-REGISTER-${requestId}] - MAC Address: ${deviceInfo.macAddress || 'not provided'}`);
    console.log(`[DEVICE-REGISTER-${requestId}] - Screen Resolution: ${deviceInfo.screenResolution ? `${deviceInfo.screenResolution.width}x${deviceInfo.screenResolution.height}` : 'not provided'}`);
    console.log(`[DEVICE-REGISTER-${requestId}] - Capabilities: ${JSON.stringify(deviceInfo.capabilities || ['video', 'audio'])}`);
    
    console.log(`[DEVICE-REGISTER-${requestId}] Calling DeviceService.registerDevice...`);
    
    // Register device
    const device = await DeviceService.registerDevice(deviceInfo);
    
    console.log(`[DEVICE-REGISTER-${requestId}] ✅ Device registered successfully`);
    console.log(`[DEVICE-REGISTER-${requestId}] Registered device summary:`, {
      deviceId: device.deviceId,
      uniqueId: device.uniqueId,
      deviceName: device.deviceName,
      ipAddress: device.ipAddress,
      port: device.port,
      status: device.status,
      capabilities: device.capabilities
    });
    
    res.status(201).json({ 
      success: true, 
      data: device,
      message: 'Device registered successfully' 
    });
    
    console.log(`[DEVICE-REGISTER-${requestId}] === Registration completed successfully ===`);
    
  } catch (error: unknown) {
    logError('DEVICE-REGISTER', 'Device Registration', error, context);
    const errorResponse = createErrorResponse(error);
    res.status(errorResponse.status).json(errorResponse.response);
    console.log(`[DEVICE-REGISTER-${requestId}] === Registration failed ===`);
  }
});

// PUT /api/devices/:id - Update device information
router.put('/:id', validateDeviceRegistration, async (req, res) => {
  const requestId = generateRequestId();
  const deviceId = req.params.id;
  const context = { requestId, deviceId, ip: req.ip };
  
  console.log(`[DEVICE-UPDATE-${requestId}] === Starting device update ===`);
  console.log(`[DEVICE-UPDATE-${requestId}] Device ID: ${deviceId}`);
  console.log(`[DEVICE-UPDATE-${requestId}] Update data:`, JSON.stringify(req.body, null, 2));
  
  try {
    const updateData = req.body;
    
    // Check if device exists
    console.log(`[DEVICE-UPDATE-${requestId}] Checking if device exists...`);
    const existingDevice = await DeviceService.getDeviceById(deviceId);
    if (!existingDevice) {
      console.warn(`[DEVICE-UPDATE-${requestId}] ⚠️  Device not found: ${deviceId}`);
      return res.status(404).json({ success: false, error: 'Device not found' });
    }
    
    console.log(`[DEVICE-UPDATE-${requestId}] Device found:`, {
      deviceId: existingDevice.deviceId,
      deviceName: existingDevice.deviceName,
      ipAddress: existingDevice.ipAddress,
      status: existingDevice.status
    });
    
    // Update device (use registerDevice with explicit deviceId)
    console.log(`[DEVICE-UPDATE-${requestId}] Calling registerDevice for update...`);
    const updatedDevice = await DeviceService.registerDevice({
      deviceId: deviceId,
      ...updateData
    });
    
    console.log(`[DEVICE-UPDATE-${requestId}] ✅ Device updated successfully`);
    console.log(`[DEVICE-UPDATE-${requestId}] Updated device summary:`, {
      deviceId: updatedDevice.deviceId,
      deviceName: updatedDevice.deviceName,
      ipAddress: updatedDevice.ipAddress,
      port: updatedDevice.port,
      status: updatedDevice.status
    });
    
    res.json({ 
      success: true, 
      data: updatedDevice,
      message: 'Device updated successfully' 
    });
    
    console.log(`[DEVICE-UPDATE-${requestId}] === Update completed successfully ===`);
    
  } catch (error: unknown) {
    logError('DEVICE-UPDATE', 'Device Update', error, context);
    const errorResponse = createErrorResponse(error);
    res.status(errorResponse.status).json(errorResponse.response);
    console.log(`[DEVICE-UPDATE-${requestId}] === Update failed ===`);
  }
});

// GET /api/devices/:id - Get device by ID
router.get('/:id', async (req, res) => {
  const deviceId = req.params.id;
  const context = { deviceId };
  
  console.log(`[DEVICES] GET /api/devices/${deviceId} - Fetching device by ID`);
  
  try {
    const device = await DeviceService.getDeviceById(deviceId);
    if (!device) {
      console.warn(`[DEVICES] Device not found: ${deviceId}`);
      return res.status(404).json({ success: false, error: 'Device not found' });
    }
    
    console.log(`[DEVICES] Device found: ${device.deviceName} (${device.status})`);
    res.json({ success: true, data: device });
  } catch (error: unknown) {
    logError('DEVICES', 'Get Device By ID', error, context);
    const errorResponse = createErrorResponse(error);
    res.status(errorResponse.status).json(errorResponse.response);
  }
});

// GET /api/devices/search/:identifier - Get device by any identifier
router.get('/search/:identifier', async (req, res) => {
  const identifier = req.params.identifier;
  const context = { identifier };
  
  console.log(`[DEVICES] GET /api/devices/search/${identifier} - Searching device by identifier`);
  
  try {
    const device = await DeviceService.getDeviceByIdentifier(identifier);
    if (!device) {
      console.warn(`[DEVICES] Device not found by identifier: ${identifier}`);
      return res.status(404).json({ success: false, error: 'Device not found' });
    }
    
    console.log(`[DEVICES] Device found by identifier: ${device.deviceName} (${device.deviceId})`);
    res.json({ success: true, data: device });
  } catch (error: unknown) {
    logError('DEVICES', 'Search Device By Identifier', error, context);
    const errorResponse = createErrorResponse(error);
    res.status(errorResponse.status).json(errorResponse.response);
  }
});

// GET /api/devices/capability/:capability - Get devices by capability
router.get('/capability/:capability', async (req, res) => {
  const capability = req.params.capability;
  const context = { capability };
  
  console.log(`[DEVICES] GET /api/devices/capability/${capability} - Fetching devices by capability`);
  
  try {
    const devices = await DeviceService.getDevicesByCapability(capability);
    
    console.log(`[DEVICES] Found ${devices.length} devices with capability: ${capability}`);
    res.json({ 
      success: true, 
      data: devices,
      count: devices.length 
    });
  } catch (error: unknown) {
    logError('DEVICES', 'Get Devices By Capability', error, context);
    const errorResponse = createErrorResponse(error);
    res.status(errorResponse.status).json(errorResponse.response);
  }
});

// DELETE /api/devices/:id - Remove device
router.delete('/:id', async (req, res) => {
  const deviceId = req.params.id;
  const context = { deviceId };
  
  console.log(`[DEVICES] DELETE /api/devices/${deviceId} - Removing device`);
  
  try {
    // Check if device exists before deleting
    const existingDevice = await DeviceService.getDeviceById(deviceId);
    if (!existingDevice) {
      console.warn(`[DEVICES] Cannot delete - Device not found: ${deviceId}`);
      return res.status(404).json({ success: false, error: 'Device not found' });
    }
    
    console.log(`[DEVICES] Deleting device: ${existingDevice.deviceName}`);
    await DeviceService.removeDevice(deviceId);
    
    console.log(`[DEVICES] ✅ Device removed successfully: ${deviceId}`);
    res.json({ success: true, message: 'Device removed successfully' });
  } catch (error: unknown) {
    logError('DEVICES', 'Remove Device', error, context);
    const errorResponse = createErrorResponse(error);
    res.status(errorResponse.status).json(errorResponse.response);
  }
});

// POST /api/devices/:id/status - Update device status
router.post('/:id/status', async (req, res) => {
  const deviceId = req.params.id;
  const { status, socketId } = req.body;
  const context = { deviceId, status, socketId };
  
  console.log(`[DEVICES] POST /api/devices/${deviceId}/status - Updating device status`);
  console.log(`[DEVICES] New status: ${status}, Socket ID: ${socketId || 'none'}`);
  
  try {
    // Validate status
    if (!status || !['online', 'offline', 'busy'].includes(status)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid status. Must be: online, offline, or busy' 
      });
    }
    
    await DeviceService.updateDeviceStatus(deviceId, status, socketId);
    
    console.log(`[DEVICES] ✅ Device status updated successfully`);
    res.json({ 
      success: true, 
      message: 'Device status updated successfully',
      data: { deviceId, status, socketId } 
    });
  } catch (error: unknown) {
    logError('DEVICES', 'Update Device Status', error, context);
    const errorResponse = createErrorResponse(error);
    res.status(errorResponse.status).json(errorResponse.response);
  }
});

// POST /api/devices/cleanup/offline - Mark stale devices as offline
router.post('/cleanup/offline', async (req, res) => {
  const { minutes = 5 } = req.body;
  const context = { minutes };
  
  console.log(`[DEVICES] POST /api/devices/cleanup/offline - Marking stale devices offline (${minutes} minutes)`);
  
  try {
    await DeviceService.markOfflineDevices(minutes);
    
    console.log(`[DEVICES] ✅ Device cleanup completed`);
    res.json({ 
      success: true, 
      message: `Stale devices marked as offline (threshold: ${minutes} minutes)` 
    });
  } catch (error: unknown) {
    logError('DEVICES', 'Cleanup Offline Devices', error, context);
    const errorResponse = createErrorResponse(error);
    res.status(errorResponse.status).json(errorResponse.response);
  }
});

export const deviceRoutes = router;