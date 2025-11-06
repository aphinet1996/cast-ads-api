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

//     // ✅ Step 1: Persist currentMedia in DB first
//     await DeviceService.updateDeviceCurrentMedia(deviceId, mediaId, options);

//     // ✅ Step 2: Send cast command to device (ONCE)
//     const socketManager = SocketManager.getInstance();
//     const success = socketManager.emitToDevice(deviceId, 'media:play', {
//       mediaId,
//       mediaFile,
//       options: options || { autoplay: true, volume: 50 }
//     });

//     if (!success) {
//       // Rollback DB if emit failed
//       await DeviceService.clearDeviceCurrentMedia(deviceId, false);
//       return res.status(400).json({ 
//         success: false, 
//         error: 'Device not connected via socket' 
//       });
//     }

//     // ✅ Step 3: Broadcast device update ONCE (debounced)
//     await socketManager.broadcastDeviceUpdate();

//     // ✅ Response to API caller
//     res.json({
//       success: true,
//       message: 'Media cast successfully',
//       data: {
//         deviceId,
//         mediaName: mediaFile.name,
//         mediaId,
//         options: options || { autoplay: true, volume: 50 }
//       }
//     });

//   } catch (error) {
//     console.error('[CAST] Error casting media:', error);
//     res.status(500).json({ success: false, error: 'Internal server error' });
//   }
// });

router.post('/', validateCastRequest, async (req, res) => {
  try {
    const { deviceId, mediaId, options } = req.body;

    console.log(`[CAST API] 📥 Received cast request: deviceId=${deviceId}, mediaId=${mediaId}`);

    // Verify device exists and is online
    const device = await DeviceService.getDeviceById(deviceId);
    if (!device) {
      console.log(`[CAST API] ❌ Device not found: ${deviceId}`);
      return res.status(404).json({ success: false, error: 'Device not found' });
    }
    if (device.status !== 'online') {
      console.log(`[CAST API] ❌ Device not online: ${deviceId} (status: ${device.status})`);
      return res.status(400).json({ success: false, error: 'Device is not online' });
    }

    // Verify media file exists
    const mediaFile = await MediaService.findByMediaId(mediaId);
    if (!mediaFile) {
      console.log(`[CAST API] ❌ Media not found: ${mediaId}`);
      return res.status(404).json({ success: false, error: 'Media file not found' });
    }

    console.log(`[CAST API] ✅ Cast validation passed, proceeding...`);

    // ✅ Step 1: Persist currentMedia in DB first
    await DeviceService.updateDeviceCurrentMedia(deviceId, mediaId, options);
    console.log(`[CAST API] 💾 Updated device currentMedia in DB`);

    // ✅ Step 2: Send cast command to device (ONCE, with duplicate protection in SocketManager)
    const socketManager = SocketManager.getInstance();
    const success = socketManager.emitToDevice(deviceId, 'media:play', {
      mediaId,
      mediaFile,
      options: options || { autoplay: true, volume: 50 }
    });

    if (!success) {
      console.log(`[CAST API] ❌ Failed to emit to device, rolling back...`);
      // Rollback DB if emit failed
      await DeviceService.clearDeviceCurrentMedia(deviceId, false);
      return res.status(400).json({
        success: false,
        error: 'Device not connected via socket'
      });
    }

    console.log(`[CAST API] ✅ Cast command sent successfully`);

    // ✅ Step 3: Broadcast device update ONCE (debounced)
    await socketManager.broadcastDeviceUpdate();

    // ✅ Response to API caller
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
    console.error('[CAST API] ❌ Error casting media:', error);
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
    const success = await socketManager.sendPlaybackControl(deviceId, control);

    if (success) {
      res.json({
        success: true,
        message: 'Control command sent successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'Failed to send control command'
      });
    }
  } catch (error) {
    console.error('[CAST] Error sending control command:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export const castRoutes = router;