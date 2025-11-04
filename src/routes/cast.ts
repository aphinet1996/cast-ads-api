import { Router } from 'express';
import { validateCastRequest, validatePlaybackControl } from '../middleware/validation';
import { DeviceService } from '../services/device.service';
import { MediaService } from '../services/media.service';
import { SocketManager } from '../services/socket.service';

const router = Router();

// POST /api/cast - Cast media to device
router.post('/', validateCastRequest, async (req, res) => {
  try {
    const { deviceId, mediaId, options } = req.body;

    // Verify device exists and is online
    const device = await DeviceService.getDeviceById(deviceId);
    if (!device) {
      return res.status(404).json({ success: false, error: 'Device not found' });
    }
    if (device.status !== 'online') {
      return res.status(400).json({ success: false, error: 'Device is not online' });
    }

    // Verify media file exists
    const mediaFile = await MediaService.findByMediaId(mediaId);
    if (!mediaFile) {
      return res.status(404).json({ success: false, error: 'Media file not found' });
    }

    // Send cast command via socket
    const socketManager = SocketManager.getInstance();
    const success = socketManager.castToDevice(deviceId, mediaFile, options);

    if (success) {
      // Update device status
      await DeviceService.updateDeviceStatus(deviceId, 'busy');
      res.json({ success: true, message: 'Media cast successfully' });
    } else {
      res.status(400).json({ success: false, error: 'Failed to cast media' });
    }
  } catch (error) {
    console.error('Error casting media:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// POST /api/cast/:deviceId/control - Control playback
router.post('/:deviceId/control', validatePlaybackControl, async (req, res) => {
  try {
    const { deviceId } = req.params;
    const control = req.body;

    const device = await DeviceService.getDeviceById(deviceId);
    if (!device) {
      return res.status(404).json({ success: false, error: 'Device not found' });
    }

    const socketManager = SocketManager.getInstance();
    const success = socketManager.sendPlaybackControl(deviceId, control);

    if (success) {
      res.json({ success: true, message: 'Control command sent successfully' });
    } else {
      res.status(400).json({ success: false, error: 'Failed to send control command' });
    }
  } catch (error) {
    console.error('Error sending control command:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export const castRoutes = router;