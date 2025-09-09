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
    const mediaFile = await MediaService.getMediaFileById(mediaId);
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

// import { Router } from 'express';
// import { validateCastRequest, validatePlaybackControl } from '../middleware/validation';
// import { DeviceService } from '../services/device.service';
// import { MediaService } from '../services/media.service';
// import { SocketManager } from '../services/socket.service';

// const router = Router();

// router.post('/', validateCastRequest, async (req, res) => {
//   try {
//     const { deviceId, mediaId, options } = req.body;
    
//     console.log('=== CAST REQUEST DEBUG ===');
//     console.log('Request Body:', { deviceId, mediaId, options });

//     // 1. ตรวจสอบ Device
//     console.log('1. Checking device...');
//     const device = await DeviceService.getDeviceById(deviceId);
//     console.log('Device found:', device);
    
//     if (!device) {
//       console.log('❌ Device not found');
//       return res.status(404).json({ success: false, error: 'Device not found' });
//     }
    
//     if (device.status !== 'online') {
//       console.log('❌ Device not online, current status:', device.status);
//       return res.status(400).json({ 
//         success: false, 
//         error: `Device is not online (current status: ${device.status})` 
//       });
//     }
//     console.log('✅ Device is online');

//     // 2. ตรวจสอบ Media File
//     console.log('2. Checking media file...');
//     const mediaFile = await MediaService.getMediaFileById(mediaId);
//     console.log('Media file found:', mediaFile);
    
//     if (!mediaFile) {
//       console.log('❌ Media file not found');
//       return res.status(404).json({ success: false, error: 'Media file not found' });
//     }
//     console.log('✅ Media file exists');

//     // 3. ตรวจสอบ WebSocket Connection
//     console.log('3. Attempting to cast via WebSocket...');
//     const socketManager = SocketManager.getInstance();
    
//     // เพิ่มการตรวจสอบว่า device มี socketId หรือไม่
//     // if (!device.socketId) {
//     //   console.log('555555', device)
//     //   console.log('❌ Device has no active WebSocket connection');
//     //   return res.status(400).json({ 
//     //     success: false, 
//     //     error: 'Device is not connected via WebSocket' 
//     //   });
//     // }
    
//     const success = socketManager.castToDevice(deviceId, mediaFile, options);
//     console.log('Cast result:', success);

//     if (success) {
//       console.log('✅ Cast command sent successfully');
//       await DeviceService.updateDeviceStatus(deviceId, 'busy');
//       res.json({ success: true, message: 'Media cast successfully' });
//     } else {
//       console.log('❌ Cast command failed to send');
//       res.status(400).json({ success: false, error: 'Failed to cast media - device not reachable via WebSocket' });
//     }
    
//     console.log('=== END CAST REQUEST ===\n');
    
//   } catch (error) {
//     console.error('❌ Cast error:', error);
//     res.status(500).json({ success: false, error: 'Internal server error' });
//   }
// });

// export const castRoutes = router;
