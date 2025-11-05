import { Router } from 'express';
import { validateCastRequest, validatePlaybackControl } from '../middleware/validation';
import { DeviceService } from '../services/device.service';
import { MediaService } from '../services/media.service';
import { SocketManager } from '../services/socket.service';

const router = Router();

// POST /api/cast - Cast media to device
// router.post('/', validateCastRequest, async (req, res) => {
//   try {
//     const { deviceId, mediaId, options } = req.body;

//     // Verify device exists and is online
//     const device = await DeviceService.getDeviceById(deviceId);
//     if (!device) {
//       return res.status(404).json({ success: false, error: 'Device not found' });
//     }
//     if (device.status !== 'online') {
//       return res.status(400).json({ success: false, error: 'Device is not online' });
//     }

//     // Verify media file exists
//     const mediaFile = await MediaService.findByMediaId(mediaId);
//     if (!mediaFile) {
//       return res.status(404).json({ success: false, error: 'Media file not found' });
//     }

//     // Send cast command via socket
//     const socketManager = SocketManager.getInstance();
//     const success = socketManager.castToDevice(deviceId, mediaFile, options);

//     if (success) {
//       // Update device status
//       await DeviceService.updateDeviceStatus(deviceId, 'busy');

//       const socketManager = SocketManager.getInstance();
//       socketManager.broadcast('cast:success', {
//         deviceId,
//         mediaName: mediaFile.name,
//         mediaId,
//         options: options || { autoplay: true, volume: 50 }
//       });

//       res.json({
//         success: true,
//         message: 'Media cast successfully',
//         data: {
//           deviceId,
//           mediaName: mediaFile.name,
//           mediaId,
//           options: options || { autoplay: true, volume: 50 }
//         }
//       });
//     } else {
//       res.status(400).json({ success: false, error: 'Failed to cast media' });
//     }
//   } catch (error) {
//     console.error('Error casting media:', error);
//     res.status(500).json({ success: false, error: 'Internal server error' });
//   }
// });
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

    // Persist currentMedia in DB (before emit)
    await DeviceService.updateDeviceCurrentMedia(deviceId, mediaId, options);

    // Send cast command via socket (now await because async)
    // const socketManager = SocketManager.getInstance();
    // const success = await socketManager.castToDevice(deviceId, mediaFile, options); 

    // if (success) {
    //   res.json({
    //     success: true,
    //     message: 'Media cast successfully',
    //     data: {  // Optional: return data for frontend
    //       deviceId,
    //       mediaName: mediaFile.name,
    //       mediaId,
    //       options: options || { autoplay: true, volume: 50 }
    //     }
    //   });
    // } else {
    //   res.status(400).json({ success: false, error: 'Failed to cast media' });
    // }
    const socketManager = SocketManager.getInstance();
    // ส่งตรงไปที่ device โดยไม่ผ่าน castToDevice()
    socketManager.emitToDevice(deviceId, 'media:play', {
      mediaId,
      mediaFile,
      options: options || { autoplay: true, volume: 50 }
    });

    // ✅ Broadcast device update หนึ่งครั้ง
    await socketManager.broadcastDeviceUpdate();

    res.json({
      success: true,
      message: 'Media cast successfully',
      data: {
        deviceId,
        mediaName: mediaFile.name,
        mediaId,
        options: options || { autoplay: true, volume: 50 }
      }
    });
  } catch (error) {
    console.error('Error casting media:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// POST /api/cast/:deviceId/control - Control playback
// router.post('/:deviceId/control', validatePlaybackControl, async (req, res) => {
//   try {
//     const { deviceId } = req.params;
//     const control = req.body;

//     const device = await DeviceService.getDeviceById(deviceId);
//     if (!device) {
//       return res.status(404).json({ success: false, error: 'Device not found' });
//     }

//     const socketManager = SocketManager.getInstance();
//     const success = socketManager.sendPlaybackControl(deviceId, control);

//     if (success) {
//       res.json({ success: true, message: 'Control command sent successfully' });
//     } else {
//       res.status(400).json({ success: false, error: 'Failed to send control command' });
//     }
//   } catch (error) {
//     console.error('Error sending control command:', error);
//     res.status(500).json({ success: false, error: 'Internal server error' });
//   }
// });
router.post('/:deviceId/control', validatePlaybackControl, async (req, res) => {
  try {
    const { deviceId } = req.params;
    const control = req.body;

    const device = await DeviceService.getDeviceById(deviceId);
    if (!device) {
      return res.status(404).json({ success: false, error: 'Device not found' });
    }

    const socketManager = SocketManager.getInstance();
    const success = await socketManager.sendPlaybackControl(deviceId, control);  // Add await if sendPlaybackControl is async

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