// import { Router } from 'express';
// import { DeviceService } from '../services/device.service';

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

const router = Router();

// GET /api/devices - Get all devices
router.get('/', async (req, res) => {
  try {
    const devices = await DeviceService.getAllDevices();
    res.json({ success: true, data: devices });
  } catch (error) {
    console.error('Error fetching devices:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// POST /api/devices/register - Register new device (เพิ่มใหม่)
router.post('/register', validateDeviceRegistration, async (req, res) => {
  try {
    const deviceInfo = req.body;
    
    // Register device
    const device = await DeviceService.registerDevice(deviceInfo);
    
    res.status(201).json({ 
      success: true, 
      data: device,
      message: 'Device registered successfully' 
    });
  } catch (error) {
    console.error('Error registering device:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// PUT /api/devices/:id - Update device information (เพิ่มใหม่)
router.put('/:id', validateDeviceRegistration, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    // Check if device exists
    const existingDevice = await DeviceService.getDeviceById(id);
    if (!existingDevice) {
      return res.status(404).json({ success: false, error: 'Device not found' });
    }
    
    // Update device
    const updatedDevice = await DeviceService.registerDevice({
      deviceId: id,
      ...updateData
    });
    
    res.json({ 
      success: true, 
      data: updatedDevice,
      message: 'Device updated successfully' 
    });
  } catch (error) {
    console.error('Error updating device:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// GET /api/devices/:id - Get device by ID
router.get('/:id', async (req, res) => {
  try {
    const device = await DeviceService.getDeviceById(req.params.id);
    if (!device) {
      return res.status(404).json({ success: false, error: 'Device not found' });
    }
    res.json({ success: true, data: device });
  } catch (error) {
    console.error('Error fetching device:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// DELETE /api/devices/:id - Remove device
router.delete('/:id', async (req, res) => {
  try {
    await DeviceService.removeDevice(req.params.id);
    res.json({ success: true, message: 'Device removed successfully' });
  } catch (error) {
    console.error('Error removing device:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export const deviceRoutes = router;