import { Document, Types } from 'mongoose';

export interface ScreenResolution {
    width: number;
    height: number;
}

export interface Device {
    _id?: string;
    serialNumber?: string;
    deviceId: string;
    uniqueId?: string;
    instanceId?: string;
    deviceOS?: string;
    deviceName?: string;
    modelName?: string;
    ipAddress: string;
    port: number;
    macAddress?: string;
    screenResolution?: ScreenResolution;
    capabilities: ('video' | 'audio' | 'image' | 'document' | 'presentation')[];
    status: 'online' | 'offline' | 'busy';
    lastSeen: Date;
    socketId?: string;
    createdAt?: Date;
    updatedAt?: Date;
}

// Request types for API
export interface RegisterDeviceRequest {
    deviceId: string;
    ipAddress: string;
    port?: number;
    deviceName?: string;
    deviceOS?: string;
    modelName?: string;
    serialNumber?: string;
    uniqueId?: string;
    macAddress?: string;
    screenResolution?: ScreenResolution;
    capabilities?: string[];
}

export interface UpdateDeviceStatusRequest {
    status: 'online' | 'offline' | 'busy';
}

export interface DeviceFilters {
    status?: 'online' | 'offline' | 'busy';
    capability?: string;
    search?: string;
}

// Response types
export interface DeviceResponse {
    success: boolean;
    data?: Device | Device[];
    count?: number;
    message?: string;
    error?: string;
}

export interface DeviceStats {
    total: number;
    online: number;
    offline: number;
    busy: number;
}