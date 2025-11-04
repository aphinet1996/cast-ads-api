import { Request, Response } from 'express';
import { DeviceService } from '../services/device.service';
import { SocketManager } from '../services/socket.service';

export class DeviceController {
    /**
     * GET /api/devices
     * Get all devices with optional filters
     */
    static async getAllDevices(req: Request, res: Response) {
        try {
            const { status, capability, search } = req.query;

            const devices = await DeviceService.getAllDevices({
                status: status as string,
                capability: capability as string,
                search: search as string
            });

            res.json({
                success: true,
                count: devices.length,
                data: devices
            });
        } catch (error: any) {
            res.status(500).json({
                success: false,
                message: 'Error fetching devices',
                error: error.message
            });
        }
    }

    /**
     * GET /api/devices/online
     * Get all online devices
     */
    static async getOnlineDevices(req: Request, res: Response) {
        try {
            const devices = await DeviceService.findOnlineDevices();

            res.json({
                success: true,
                count: devices.length,
                data: devices
            });
        } catch (error: any) {
            res.status(500).json({
                success: false,
                message: 'Error fetching online devices',
                error: error.message
            });
        }
    }

    /**
     * GET /api/devices/stats
     * Get device statistics
     */
    static async getDeviceStats(req: Request, res: Response) {
        try {
            const stats = await DeviceService.getDeviceStats();

            res.json({
                success: true,
                data: stats
            });
        } catch (error: any) {
            res.status(500).json({
                success: false,
                message: 'Error fetching device stats',
                error: error.message
            });
        }
    }

    /**
     * GET /api/devices/capability/:capability
     * Get devices by capability
     */
    static async getDevicesByCapability(req: Request, res: Response) {
        try {
            const { capability } = req.params;
            const devices = await DeviceService.findByCapability(capability);

            res.json({
                success: true,
                count: devices.length,
                data: devices
            });
        } catch (error: any) {
            res.status(500).json({
                success: false,
                message: 'Error fetching devices by capability',
                error: error.message
            });
        }
    }

    /**
     * GET /api/devices/:identifier
     * Get device by ID, uniqueId, or serialNumber
     */
    static async getDeviceByIdentifier(req: Request, res: Response) {
        try {
            const { identifier } = req.params;
            const device = await DeviceService.findByIdentifier(identifier);

            if (!device) {
                return res.status(404).json({
                    success: false,
                    message: 'Device not found'
                });
            }

            res.json({
                success: true,
                data: DeviceService.toPublicJSON(device)
            });
        } catch (error: any) {
            res.status(500).json({
                success: false,
                message: 'Error fetching device',
                error: error.message
            });
        }
    }

    /**
     * POST /api/devices/register
     * Register or update a device
     */
    static async registerDevice(req: Request, res: Response) {
        try {
            const deviceData = req.body;

            if (!deviceData.deviceId) {
                return res.status(400).json({
                    success: false,
                    message: 'Device ID is required'
                });
            }

            const device = await DeviceService.registerDevice(deviceData);

            res.status(201).json({
                success: true,
                message: 'Device registered successfully',
                data: DeviceService.toPublicJSON(device)
            });
        } catch (error: any) {
            res.status(500).json({
                success: false,
                message: 'Error registering device',
                error: error.message
            });
        }
    }

    /**
     * PUT /api/devices/:deviceId/status
     * Update device status
     */
    static async updateDeviceStatus(req: Request, res: Response) {
        try {
            const { deviceId } = req.params;
            const { status } = req.body;

            if (!['online', 'offline', 'busy'].includes(status)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid status. Must be online, offline, or busy'
                });
            }

            const device = await DeviceService.updateDeviceStatus(deviceId, status);

            if (!device) {
                return res.status(404).json({
                    success: false,
                    message: 'Device not found'
                });
            }

            res.json({
                success: true,
                message: 'Device status updated',
                data: DeviceService.toPublicJSON(device)
            });
        } catch (error: any) {
            res.status(500).json({
                success: false,
                message: 'Error updating device status',
                error: error.message
            });
        }
    }

    /**
     * PUT /api/devices/:deviceId/heartbeat
     * Update device last seen (heartbeat)
     */
    static async deviceHeartbeat(req: Request, res: Response) {
        try {
            const { deviceId } = req.params;
            const device = await DeviceService.updateLastSeen(deviceId);

            if (!device) {
                return res.status(404).json({
                    success: false,
                    message: 'Device not found'
                });
            }

            res.json({
                success: true,
                message: 'Heartbeat received',
                data: {
                    deviceId: device.deviceId,
                    lastSeen: device.lastSeen,
                    status: device.status
                }
            });
        } catch (error: any) {
            res.status(500).json({
                success: false,
                message: 'Error processing heartbeat',
                error: error.message
            });
        }
    }

    /**
     * DELETE /api/devices/:deviceId
     * Delete a device
     */
    static async deleteDevice(req: Request, res: Response) {
        try {
            const { deviceId } = req.params;
            const device = await DeviceService.deleteDevice(deviceId);

            if (!device) {
                return res.status(404).json({
                    success: false,
                    message: 'Device not found'
                });
            }

            res.json({
                success: true,
                message: 'Device deleted successfully'
            });
        } catch (error: any) {
            res.status(500).json({
                success: false,
                message: 'Error deleting device',
                error: error.message
            });
        }
    }

    /**
     * POST /api/devices/cleanup
     * Mark stale devices as offline
     */
    static async cleanupStaleDevices(req: Request, res: Response) {
        try {
            const { minutes = 5 } = req.body;
            const result = await DeviceService.markStaleDevicesOffline(minutes);

            res.json({
                success: true,
                message: `Marked ${result.modifiedCount} devices as offline`,
                modifiedCount: result.modifiedCount
            });
        } catch (error: any) {
            res.status(500).json({
                success: false,
                message: 'Error cleaning up stale devices',
                error: error.message
            });
        }
    }

    /**
     * PATCH /api/devices/:deviceId/name
     * Update device name
     */
    static async updateDeviceName(req: Request, res: Response) {
        try {
            const { deviceId } = req.params;
            const { name } = req.body;

            console.log(`[DEVICE-CONTROLLER] Updating device name: ${deviceId}`);
            console.log(`[DEVICE-CONTROLLER] New name: ${name}`);

            // Validate request body
            if (!name) {
                return res.status(400).json({
                    success: false,
                    message: 'Device name is required'
                });
            }

            // Update device name
            const updatedDevice = await DeviceService.updateDeviceName(deviceId, name);

            if (!updatedDevice) {
                return res.status(404).json({
                    success: false,
                    message: 'Device not found'
                });
            }

            console.log(`[DEVICE-CONTROLLER] ✅ Device name updated successfully`);

            // 🔥 Broadcast socket event to all clients
            const socketManager = SocketManager.getInstance();
            socketManager.broadcast('device:updated', DeviceService.toPublicJSON(updatedDevice));

            console.log(`[DEVICE-CONTROLLER] Socket event broadcasted: device:updated`);

            res.json({
                success: true,
                message: 'Device name updated successfully',
                data: DeviceService.toPublicJSON(updatedDevice)
            });

        } catch (error: any) {
            console.error('[DEVICE-CONTROLLER] Error updating device name:', error);

            res.status(500).json({
                success: false,
                message: error.message || 'Error updating device name',
                error: error.message
            });
        }
    }
}