import { DeviceModel, type DeviceDocument } from '../models/device';
import { MediaFileModel } from '../models/media';  // Add for populate
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
     * Update device status with optional socketId (preserve currentMedia)
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

        // Use $set to preserve other fields like currentMedia
        return await DeviceModel.findOneAndUpdate(
            { deviceId },
            { $set: updateData },
            { new: true }
        );
    }

    /**
     * NEW: Update device currentMedia after cast
     */
    static async updateDeviceCurrentMedia(
        deviceId: string,
        mediaId: string,
        options: any = {}
    ): Promise<DeviceDocument | null> {
        // Get media name
        const mediaFile = await MediaFileModel.findOne({ mediaId }).select('name');
        if (!mediaFile) {
            return null;  // Media not found
        }

        const currentMediaUpdate = {
            mediaId: mediaId,
            name: mediaFile.name,
            isPlaying: options.autoplay !== undefined ? options.autoplay : true,
            volume: options.volume || 50,
            options: options  // Extra options (autoplay, loop, startTime, etc.)
        };

        const updateData = {
            status: 'busy',
            lastSeen: new Date(),
            currentMedia: currentMediaUpdate
        };

        return await DeviceModel.findOneAndUpdate(
            { deviceId },
            { $set: updateData },
            { new: true }
        );
    }

    /**
     * NEW: Clear device currentMedia (for stop)
     */
    static async clearDeviceCurrentMedia(
        deviceId: string,
        toOnline: boolean = false
    ): Promise<DeviceDocument | null> {
        const updateData: any = {
            lastSeen: new Date()
        };

        if (toOnline) {
            updateData.status = 'online';
        }

        return await DeviceModel.findOneAndUpdate(
            { deviceId },
            { 
                $set: updateData,
                $unset: { currentMedia: 1 }
            },
            { new: true }
        );
    }

    /**
     * Register or update device (initialize currentMedia)
     */
    static async registerDevice(deviceData: Partial<Device>): Promise<DeviceDocument> {
        const existingDevice = await DeviceModel.findOne({ deviceId: deviceData.deviceId });

        if (existingDevice) {
            // Update existing device
            Object.assign(existingDevice, deviceData);
            existingDevice.lastSeen = new Date();
            existingDevice.status = 'online';
            // Initialize currentMedia if null
            if (existingDevice.currentMedia === undefined) {
                existingDevice.currentMedia = null;
            }
            return await existingDevice.save();
        } else {
            // Create new device
            const newDevice = new DeviceModel({
                ...deviceData,
                status: 'online',
                lastSeen: new Date(),
                currentMedia: null
            });
            console.log('regis device', newDevice)
            return await newDevice.save();
        }
    }

    /**
     * Get all devices with filters (populate currentMedia)
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

        // const devices = await DeviceModel.find(query)
        //     .populate('currentMedia.mediaId', 'name') 
        //     .sort({ lastSeen: -1 });
        const devices = await DeviceModel.find(query)
        .sort({ lastSeen: -1 });
        
        // Sort by IP address (convert to number for proper sorting)
        return devices.sort((a, b) => {
            const ipA = this.ipToNumber(a.ipAddress);
            const ipB = this.ipToNumber(b.ipAddress);
            return ipA - ipB;
        });
    }

    /**
     * Convert IP address to number for sorting
     */
    private static ipToNumber(ip: string): number {
        return ip.split('.')
            .reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
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