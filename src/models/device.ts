import mongoose, { Schema, Document } from 'mongoose';
import { Device as IDevice } from '../types';

interface DeviceDocument extends Omit<IDevice, 'deviceId'>, Document {
    deviceId: string;
}

const deviceSchema = new Schema<DeviceDocument>({
    deviceId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    ip: { type: String, required: true },
    port: { type: Number, default: 3001 },
    status: {
        type: String,
        enum: ['online', 'offline', 'busy'],
        default: 'offline'
    },
    lastSeen: { type: Date, default: Date.now },
    capabilities: [{ type: String }],
    socketId: { type: String }
}, {
    timestamps: true
});

export const DeviceModel = mongoose.model<DeviceDocument>('Device', deviceSchema);