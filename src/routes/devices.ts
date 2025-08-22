import { Router } from 'express';
import { DeviceService } from '../services/device.service';

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