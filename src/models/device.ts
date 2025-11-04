import mongoose, { Schema, Document } from 'mongoose';
import { Device as IDevice, ScreenResolution } from '../types';

export interface DeviceDocument extends IDevice, Document {}

const screenResolutionSchema = new Schema<ScreenResolution>({
    width: { 
        type: Number, 
        required: true,
        min: [1, 'Screen width must be at least 1 pixel']
    },
    height: { 
        type: Number, 
        required: true,
        min: [1, 'Screen height must be at least 1 pixel']
    }
}, { _id: false });

const deviceSchema = new Schema<DeviceDocument>({
    // serialNumber: { 
    //     type: String, 
    //     trim: true,
    //     sparse: true
    // },
    deviceId: { 
        type: String, 
        required: [true, 'Device ID is required'], 
        trim: true,
        index: true
    },
    uniqueId: { 
        type: String,
        // required: [true, 'UniqueId ID is required'],
        trim: true
    },
    instanceId: { 
        type: String, 
        trim: true,
        sparse: true
    },
    deviceOS: { 
        type: String, 
        trim: true,
        maxlength: [50, 'Device OS name cannot exceed 50 characters']
    },
    deviceName: { 
        type: String, 
        trim: true,
        maxlength: [100, 'Device name cannot exceed 100 characters']
    },
    modelName: { 
        type: String, 
        trim: true,
        maxlength: [100, 'Model name cannot exceed 100 characters']
    },
    ipAddress: { 
        type: String, 
        required: [true, 'IP address is required'],
        validate: {
            validator: function(v: string) {
                return /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(v);
            },
            message: 'Please enter a valid IPv4 address'
        }
    },
    // port: { 
    //     type: Number, 
    //     default: 3001,
    //     min: [1024, 'Port must be at least 1024'],
    //     max: [65535, 'Port must not exceed 65535']
    // },
    macAddress: { 
        type: String, 
        trim: true,
        sparse: true,
        validate: {
            validator: function(v: string) {
                if (!v) return true;
                return /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/.test(v);
            },
            message: 'Please enter a valid MAC address (e.g., 00:1B:44:11:3A:B7)'
        }
    },
    
    screenResolution: screenResolutionSchema,

    status: {
        type: String,
        enum: {
            values: ['online', 'offline', 'busy'],
            message: 'Status must be online, offline, or busy'
        },
        default: 'offline'
    },
    lastSeen: { 
        type: Date, 
        default: Date.now
    },
    socketId: { 
        type: String,
        sparse: true
    }
}, {
    timestamps: true,
    collection: 'devices'
});

// Add indexes for better performance
deviceSchema.index({ uniqueId: 1 });
deviceSchema.index({ serialNumber: 1 });
deviceSchema.index({ status: 1 });
deviceSchema.index({ lastSeen: 1 });
deviceSchema.index({ ipAddress: 1, port: 1 });
deviceSchema.index({ deviceId: 1, status: 1 });
deviceSchema.index({ deviceName: 'text' });

// Pre-save middleware
deviceSchema.pre('save', function(next) {
    if (this.macAddress) {
        this.macAddress = this.macAddress.toUpperCase().replace(/-/g, ':');
    }
    
    next();
});

export const DeviceModel = mongoose.model<DeviceDocument>('Device', deviceSchema);