import { DeviceModel } from '../models/device';
import { Device } from '../types';
import { v4 as uuidv4 } from 'uuid';

export class DeviceService {
    static async registerDevice(deviceInfo: Partial<Device>): Promise<Device> {
        const deviceId = deviceInfo.deviceId || uuidv4();

        const existingDevice = await DeviceModel.findOne({ deviceId });

        if (existingDevice) {
            // Update existing device
            const updated = await DeviceModel.findOneAndUpdate(
                { deviceId },
                {
                    ...deviceInfo,
                    status: 'online',
                    lastSeen: new Date()
                },
                { new: true }
            );
            return this.transformDevice(updated!);
        } else {
            // Create new device
            const newDevice = new DeviceModel({
                deviceId,
                name: deviceInfo.name || `Device ${deviceId.slice(0, 8)}`,
                ip: deviceInfo.ip || '127.0.0.1',
                port: deviceInfo.port || 3001,
                status: 'online',
                capabilities: deviceInfo.capabilities || ['video', 'audio'],
                lastSeen: new Date()
            });

            const saved = await newDevice.save();
            return this.transformDevice(saved);
        }
    }

    static async updateDeviceStatus(deviceId: string, status: Device['status'], socketId?: string): Promise<void> {
        await DeviceModel.updateOne(
            { deviceId },
            {
                status,
                lastSeen: new Date(),
                ...(socketId && { socketId })
            }
        );
    }

    static async getAllDevices(): Promise<Device[]> {
        const devices = await DeviceModel.find({}).lean();
        return devices.map(device => this.transformDevice(device));
    }

    static async getDeviceById(deviceId: string): Promise<Device | null> {
        const device = await DeviceModel.findOne({ deviceId }).lean();
        return device ? this.transformDevice(device) : null;
    }

    static async removeDevice(deviceId: string): Promise<void> {
        await DeviceModel.deleteOne({ deviceId });
    }

    static async markOfflineDevices(): Promise<void> {
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        await DeviceModel.updateMany(
            { lastSeen: { $lt: fiveMinutesAgo }, status: { $ne: 'offline' } },
            { status: 'offline' }
        );
    }

    private static transformDevice(device: any): Device {
        return {
            deviceId: device.deviceId,
            name: device.name,
            ip: device.ip,
            port: device.port,
            status: device.status,
            lastSeen: device.lastSeen,
            currentMedia: device.currentMedia,
            capabilities: device.capabilities,
            socketId: device.socketId
        };
    }
}