// import { DeviceModel, DeviceDocument } from '../models/device';
// import { Device } from '../types';
// import { v4 as uuidv4 } from 'uuid';
// import { toError, logError } from '../utils/error-handler';

// export class DeviceService {
//     static async registerDevice(deviceInfo: Partial<Device>): Promise<Device> {
//         const functionId = Date.now().toString(36) + Math.random().toString(36).substr(2);
//         const context = { 
//             functionId, 
//             deviceId: deviceInfo.deviceId || 'auto-generate',
//             action: 'registerDevice'
//         };

//         try {
//             // Generate deviceId if not provided or empty
//             const deviceId = deviceInfo.deviceId?.trim() || uuidv4();
//             console.log(`[SERVICE-${functionId}] Device ID: ${deviceId} ${deviceInfo.deviceId ? '(provided)' : '(auto-generated)'}`);

//             // Check for existing device by deviceId, uniqueId, or serialNumber
//             console.log(`[SERVICE-${functionId}] Checking for existing device...`);
//             const existingDevice = await this.findExistingDevice(deviceId, deviceInfo);

//             if (existingDevice) {
//                 console.log(`[SERVICE-${functionId}] ♻️  Existing device found, updating...`);
//                 console.log(`[SERVICE-${functionId}] Existing device:`, {
//                     deviceId: existingDevice.deviceId,
//                     deviceName: existingDevice.deviceName,
//                     ipAddress: existingDevice.ipAddress,
//                     status: existingDevice.status,
//                     lastSeen: existingDevice.lastSeen
//                 });

//                 return await this.updateExistingDevice(existingDevice, deviceInfo, functionId);
//             } else {
//                 console.log(`[SERVICE-${functionId}] 🆕 No existing device found, creating new one...`);
//                 return await this.createNewDevice(deviceId, deviceInfo, functionId);
//             }

//         } catch (error: unknown) {
//             const errorContext = { ...context, input: deviceInfo };
//             logError('SERVICE', 'Device Registration', error, errorContext);

//             const errorObj = toError(error);
//             throw new Error(`Device registration failed: ${errorObj.message}`);
//         }
//     }

//     private static async findExistingDevice(deviceId: string, deviceInfo: Partial<Device>): Promise<DeviceDocument | null> {
//         const query: any = {
//             $or: [
//                 { deviceId: deviceId }
//             ]
//         };

//         // Add uniqueId to search if provided
//         if (deviceInfo.uniqueId?.trim()) {
//             query.$or.push({ uniqueId: deviceInfo.uniqueId.trim() });
//         }

//         // Add serialNumber to search if provided
//         if (deviceInfo.serialNumber?.trim()) {
//             query.$or.push({ serialNumber: deviceInfo.serialNumber.trim() });
//         }

//         console.log(`[SERVICE] Searching for existing device with query:`, query);
//         return await DeviceModel.findOne(query);
//     }

//     private static async updateExistingDevice(
//         existingDevice: DeviceDocument, 
//         deviceInfo: Partial<Device>, 
//         functionId: string
//     ): Promise<Device> {

//         const updatePayload = {
//             // Update all provided fields
//             ...(deviceInfo.serialNumber !== undefined && { serialNumber: deviceInfo.serialNumber.trim() }),
//             ...(deviceInfo.deviceOS !== undefined && { deviceOS: deviceInfo.deviceOS.trim() }),
//             ...(deviceInfo.deviceName !== undefined && { deviceName: deviceInfo.deviceName.trim() }),
//             ...(deviceInfo.ipAddress !== undefined && { ipAddress: deviceInfo.ipAddress }),
//             ...(deviceInfo.instanceId !== undefined && { instanceId: deviceInfo.instanceId.trim() }),
//             ...(deviceInfo.macAddress !== undefined && { macAddress: deviceInfo.macAddress.trim() }),
//             ...(deviceInfo.modelName !== undefined && { modelName: deviceInfo.modelName.trim() }),
//             ...(deviceInfo.uniqueId !== undefined && { uniqueId: deviceInfo.uniqueId.trim() }),
//             ...(deviceInfo.port !== undefined && { port: deviceInfo.port }),
//             ...(deviceInfo.screenResolution !== undefined && { screenResolution: deviceInfo.screenResolution }),
//             ...(deviceInfo.capabilities !== undefined && { capabilities: deviceInfo.capabilities }),

//             // Always update status and lastSeen
//             status: deviceInfo.status || 'online',
//             lastSeen: new Date()
//         };

//         console.log(`[SERVICE-${functionId}] Update payload:`, JSON.stringify(updatePayload, null, 2));

//         const updated = await DeviceModel.findOneAndUpdate(
//             { deviceId: existingDevice.deviceId },
//             updatePayload,
//             { new: true, runValidators: true }
//         );

//         if (!updated) {
//             throw new Error('Failed to update device - device not found after update attempt');
//         }

//         console.log(`[SERVICE-${functionId}] ✅ Device updated successfully`);
//         console.log(`[SERVICE-${functionId}] Updated device:`, {
//             deviceId: updated.deviceId,
//             deviceName: updated.deviceName,
//             ipAddress: updated.ipAddress,
//             port: updated.port,
//             status: updated.status
//         });

//         return this.transformDevice(updated);
//     }

//     private static async createNewDevice(
//         deviceId: string, 
//         deviceInfo: Partial<Device>, 
//         functionId: string
//     ): Promise<Device> {

//         const newDeviceData = {
//             // Required fields
//             deviceId,
//             name: deviceInfo.deviceName || `Device ${deviceId.slice(0, 8)}`,
//             ipAddress: deviceInfo.ipAddress || '127.0.0.1',

//             // Optional identification fields
//             serialNumber: deviceInfo.serialNumber?.trim() || '',
//             uniqueId: deviceInfo.uniqueId?.trim() || '',
//             instanceId: deviceInfo.instanceId?.trim() || '',

//             // Optional device information
//             deviceOS: deviceInfo.deviceOS?.trim() || '',
//             deviceName: deviceInfo.deviceName?.trim() || '',
//             modelName: deviceInfo.modelName?.trim() || '',

//             // Network information
//             port: deviceInfo.port || 3001,
//             macAddress: deviceInfo.macAddress?.trim() || '',

//             // Screen information
//             ...(deviceInfo.screenResolution && { screenResolution: deviceInfo.screenResolution }),

//             // Capabilities and status
//             capabilities: deviceInfo.capabilities || ['video', 'audio'],
//             status: deviceInfo.status || 'online',

//             // Tracking
//             lastSeen: new Date()
//         };

//         console.log(`[SERVICE-${functionId}] New device data:`, JSON.stringify(newDeviceData, null, 2));

//         const newDevice = new DeviceModel(newDeviceData);
//         console.log(`[SERVICE-${functionId}] Saving new device to database...`);

//         const saved = await newDevice.save();

//         console.log(`[SERVICE-${functionId}] ✅ New device saved successfully`);
//         console.log(`[SERVICE-${functionId}] Saved device _id: ${saved._id}`);
//         console.log(`[SERVICE-${functionId}] Saved device data:`, {
//             deviceId: saved.deviceId,
//             deviceName: saved.deviceName,
//             ipAddress: saved.ipAddress,
//             port: saved.port,
//             status: saved.status,
//             capabilities: saved.capabilities
//         });

//         return this.transformDevice(saved);
//     }

//     static async updateDeviceStatus(
//         deviceId: string, 
//         status: Device['status'], 
//         socketId?: string
//     ): Promise<void> {
//         const context = { deviceId, newStatus: status, socketId };

//         console.log(`[SERVICE] updateDeviceStatus called for device: ${deviceId}`);
//         console.log(`[SERVICE] New status: ${status}, socketId: ${socketId || 'none'}`);

//         try {
//             const updateData = {
//                 status,
//                 lastSeen: new Date(),
//                 ...(socketId && { socketId })
//             };

//             const result = await DeviceModel.updateOne(
//                 { deviceId },
//                 updateData
//             );

//             console.log(`[SERVICE] Update result:`, {
//                 acknowledged: result.acknowledged,
//                 modifiedCount: result.modifiedCount,
//                 matchedCount: result.matchedCount
//             });

//             if (result.matchedCount === 0) {
//                 throw new Error(`Device not found: ${deviceId}`);
//             }

//             console.log(`[SERVICE] ✅ Device status updated successfully`);

//         } catch (error: unknown) {
//             logError('SERVICE', 'Update Device Status', error, context);
//             throw toError(error);
//         }
//     }

//     static async getAllDevices(): Promise<Device[]> {
//         console.log(`[SERVICE] getAllDevices called`);

//         try {
//             const devices = await DeviceModel.find({})
//                 .sort({ lastSeen: -1 }) // Sort by most recently seen
//                 .lean();

//             console.log(`[SERVICE] Found ${devices.length} devices`);

//             return devices.map(device => this.transformDevice(device));

//         } catch (error: unknown) {
//             logError('SERVICE', 'Get All Devices', error);
//             throw toError(error);
//         }
//     }

//     static async getDeviceById(deviceId: string): Promise<Device | null> {
//         const context = { deviceId };

//         console.log(`[SERVICE] getDeviceById called for: ${deviceId}`);

//         try {
//             const device = await DeviceModel.findOne({ deviceId }).lean();

//             if (!device) {
//                 console.log(`[SERVICE] Device not found: ${deviceId}`);
//                 return null;
//             }

//             console.log(`[SERVICE] ✅ Device found: ${device.deviceName}`);
//             return this.transformDevice(device);

//         } catch (error: unknown) {
//             logError('SERVICE', 'Get Device By ID', error, context);
//             throw toError(error);
//         }
//     }

//     static async getDeviceByIdentifier(identifier: string): Promise<Device | null> {
//         const context = { identifier };

//         console.log(`[SERVICE] getDeviceByIdentifier called for: ${identifier}`);

//         try {
//             const device = await DeviceModel.findByIdentifier(identifier);

//             if (!device) {
//                 console.log(`[SERVICE] Device not found by identifier: ${identifier}`);
//                 return null;
//             }

//             console.log(`[SERVICE] ✅ Device found by identifier: ${device.deviceName}`);
//             return this.transformDevice(device);

//         } catch (error: unknown) {
//             logError('SERVICE', 'Get Device By Identifier', error, context);
//             throw toError(error);
//         }
//     }

//     static async getDevicesByCapability(capability: string): Promise<Device[]> {
//         const context = { capability };

//         console.log(`[SERVICE] getDevicesByCapability called for: ${capability}`);

//         try {
//             const devices = await DeviceModel.findByCapability(capability);

//             console.log(`[SERVICE] Found ${devices.length} devices with capability: ${capability}`);

//             return devices.map(device => this.transformDevice(device));

//         } catch (error: unknown) {
//             logError('SERVICE', 'Get Devices By Capability', error, context);
//             throw toError(error);
//         }
//     }

//     static async removeDevice(deviceId: string): Promise<void> {
//         const context = { deviceId };

//         console.log(`[SERVICE] removeDevice called for: ${deviceId}`);

//         try {
//             const result = await DeviceModel.deleteOne({ deviceId });

//             if (result.deletedCount === 0) {
//                 throw new Error(`Device not found: ${deviceId}`);
//             }

//             console.log(`[SERVICE] ✅ Device removed successfully`);

//         } catch (error: unknown) {
//             logError('SERVICE', 'Remove Device', error, context);
//             throw toError(error);
//         }
//     }

//     static async markOfflineDevices(minutes: number = 5): Promise<void> {
//         console.log(`[SERVICE] markOfflineDevices called (${minutes} minutes threshold)`);

//         try {
//             const result = await DeviceModel.markStaleDevicesOffline(minutes);

//             console.log(`[SERVICE] Marked ${result.modifiedCount} devices as offline`);

//         } catch (error: unknown) {
//             logError('SERVICE', 'Mark Offline Devices', error);
//             throw toError(error);
//         }
//     }

//     private static transformDevice(device: any): Device {
//         try {
//             const result: Device = {
//                 serialNumber: device.serialNumber || '',
//                 deviceId: device.deviceId,
//                 deviceOS: device.deviceOS || '',
//                 deviceName: device.deviceName || '',
//                 // name: device.name,
//                 ipAddress: device.ipAddress,
//                 instanceId: device.instanceId || '',
//                 macAddress: device.macAddress || '',
//                 modelName: device.modelName || '',
//                 uniqueId: device.uniqueId || '',
//                 port: device.port,
//                 screenResolution: device.screenResolution || { width: 0, height: 0 },
//                 capabilities: device.capabilities || [],
//                 status: device.status,
//                 lastSeen: device.lastSeen,
//                 currentMedia: device.currentMedia,
//                 socketId: device.socketId
//             };

//             return result;

//         } catch (error: unknown) {
//             const context = { originalDevice: device };
//             logError('SERVICE', 'Transform Device', error, context);
//             throw toError(error);
//         }
//     }
// }

import { DeviceModel, type DeviceDocument } from '../models/device';
import { Device } from '../types';

export class DeviceService {
    /**
     * Find all online devices
     */
    static async findOnlineDevices(): Promise<DeviceDocument[]> {
        return await DeviceModel.find({ status: 'online' });
    }

    /**
     * Find devices by capability
     */
    static async findByCapability(capability: string): Promise<DeviceDocument[]> {
        return await DeviceModel.find({ capabilities: capability });
    }

    /**
     * Find devices by IP address
     */
    static async findByIP(ipAddress: string): Promise<DeviceDocument[]> {
        return await DeviceModel.find({ ipAddress });
    }

    /**
     * Find device by ID (alias for findByIdentifier for backward compatibility)
     */
    static async getDeviceById(deviceId: string): Promise<DeviceDocument | null> {
        return await DeviceModel.findOne({ deviceId });
    }

    /**
     * Find device by multiple identifiers
     */
    static async findByIdentifier(identifier: string): Promise<DeviceDocument | null> {
        return await DeviceModel.findOne({
            $or: [
                { deviceId: identifier },
                { uniqueId: identifier },
                { serialNumber: identifier }
            ]
        });
    }

    /**
     * Check if device is online (based on lastSeen)
     */
    static isDeviceOnline(device: DeviceDocument): boolean {
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        return device.status === 'online' && device.lastSeen > fiveMinutesAgo;
    }

    /**
     * Mark stale devices as offline (alias for backward compatibility)
     */
    static async markOfflineDevices(minutes: number = 5) {
        return await DeviceService.markStaleDevicesOffline(minutes);
    }

    /**
     * Mark stale devices as offline
     */
    static async markStaleDevicesOffline(minutes: number = 5) {
        const cutoff = new Date(Date.now() - minutes * 60 * 1000);
        const result = await DeviceModel.updateMany(
            {
                lastSeen: { $lt: cutoff },
                status: { $ne: 'offline' }
            },
            { status: 'offline' }
        );
        return result;
    }

    /**
     * Update device last seen timestamp
     */
    static async updateLastSeen(deviceId: string): Promise<DeviceDocument | null> {
        return await DeviceModel.findOneAndUpdate(
            { deviceId },
            { lastSeen: new Date() },
            { new: true }
        );
    }

    /**
     * Update device status with optional socketId
     */
    static async updateDeviceStatus(
        deviceId: string,
        status: 'online' | 'offline' | 'busy',
        socketId?: string
    ): Promise<DeviceDocument | null> {
        const updateData: any = {
            status,
            lastSeen: new Date()
        };

        if (socketId) {
            updateData.socketId = socketId;
        }

        return await DeviceModel.findOneAndUpdate(
            { deviceId },
            updateData,
            { new: true }
        );
    }

    /**
     * Register or update device
     */
    static async registerDevice(deviceData: Partial<Device>): Promise<DeviceDocument> {
        const existingDevice = await DeviceModel.findOne({ deviceId: deviceData.deviceId });

        if (existingDevice) {
            // Update existing device
            Object.assign(existingDevice, deviceData);
            existingDevice.lastSeen = new Date();
            existingDevice.status = 'online';
            return await existingDevice.save();
        } else {
            // Create new device
            const newDevice = new DeviceModel({
                ...deviceData,
                status: 'online',
                lastSeen: new Date()
            });
            return await newDevice.save();
        }
    }

    /**
     * Get all devices with filters
     */
    static async getAllDevices(filters: {
        status?: string;
        capability?: string;
        search?: string;
    } = {}): Promise<DeviceDocument[]> {
        const query: any = {};

        if (filters.status) {
            query.status = filters.status;
        }

        if (filters.capability) {
            query.capabilities = filters.capability;
        }

        if (filters.search) {
            query.$text = { $search: filters.search };
        }

        return await DeviceModel.find(query).sort({ lastSeen: -1 });
    }

    /**
     * Delete device by ID
     */
    static async deleteDevice(deviceId: string): Promise<DeviceDocument | null> {
        return await DeviceModel.findOneAndDelete({ deviceId });
    }

    /**
     * Get device statistics
     */
    static async getDeviceStats() {
        const total = await DeviceModel.countDocuments();
        const online = await DeviceModel.countDocuments({ status: 'online' });
        const offline = await DeviceModel.countDocuments({ status: 'offline' });
        const busy = await DeviceModel.countDocuments({ status: 'busy' });

        return {
            total,
            online,
            offline,
            busy
        };
    }

    static async updateDeviceName(deviceId: string, newName: string): Promise<DeviceDocument | null> {
        // Validate name
        if (!newName || newName.trim().length === 0) {
            throw new Error('Device name cannot be empty');
        }

        if (newName.trim().length > 100) {
            throw new Error('Device name cannot exceed 100 characters');
        }

        // Update device name
        const updatedDevice = await DeviceModel.findOneAndUpdate(
            { deviceId },
            {
                deviceName: newName.trim(),
                lastSeen: new Date()
            },
            {
                new: true,
                runValidators: true
            }
        );

        if (!updatedDevice) {
            throw new Error(`Device not found: ${deviceId}`);
        }

        return updatedDevice;
    }

    /**
     * Convert device to public JSON (remove sensitive data)
     */
    static toPublicJSON(device: DeviceDocument) {
        const obj = device.toObject ? device.toObject() : device;
        delete obj.__v;
        // Add more fields to remove if needed
        return obj;
    }
}