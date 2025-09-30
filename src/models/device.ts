import mongoose, { Schema, Document, Model } from 'mongoose';
import { Device as IDevice, ScreenResolution } from '../types';

// Extend the Device interface to include MongoDB document properties
interface DeviceDocument extends IDevice, Document {
    createdAt: Date;
    updatedAt: Date;
}
interface DeviceModel extends Model<DeviceDocument> {
    findOnline(): Promise<DeviceDocument[]>;
    findByCapability(capability: string): Promise<DeviceDocument[]>;
    findByIP(ipAddress: string): Promise<DeviceDocument[]>;
    markStaleDevicesOffline(minutes: number): Promise<any>;
    findByIdentifier(identifier: string): Promise<DeviceDocument | null>;
}

// Screen Resolution sub-schema
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
    // Device identification
    serialNumber: { 
        type: String, 
        trim: true,
        // sparse: true
    },
    deviceId: { 
        type: String, 
        required: true, 
        trim: true
    },
    uniqueId: { 
        type: String, 
        trim: true,
        // sparse: true
    },
    instanceId: { 
        type: String, 
        trim: true,
        sparse: true
    },
    
    // Device information
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
    // Network information
    ipAddress: { 
        type: String, 
        required: true,
        validate: {
            validator: function(v: string) {
                // Enhanced IP validation regex (supports IPv4)
                return /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(v);
            },
            message: 'Please enter a valid IPv4 address'
        },
        index: true
    },
    port: { 
        type: Number, 
        default: 3001,
        min: [1024, 'Port must be at least 1024'],
        max: [65535, 'Port must not exceed 65535']
    },
    macAddress: { 
        type: String, 
        trim: true,
        sparse: true,
        validate: {
            validator: function(v: string) {
                // MAC address validation (if provided)
                if (!v) return true; // Allow empty
                return /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/.test(v);
            },
            message: 'Please enter a valid MAC address (e.g., 00:1B:44:11:3A:B7)'
        }
    },
    
    // Screen information
    screenResolution: {
        type: screenResolutionSchema,
        required: false
    },
    
    // Capabilities and status
    capabilities: [{ 
        type: String,
        enum: {
            values: ['video', 'audio', 'image', 'document', 'presentation'],
            message: 'Invalid capability type'
        }
    }],
    status: {
        type: String,
        enum: {
            values: ['online', 'offline', 'busy'],
            message: 'Status must be online, offline, or busy'
        },
        default: 'offline'
    },
    
    // Tracking information
    lastSeen: { 
        type: Date, 
        default: Date.now
    },
    socketId: { 
        type: String,
        sparse: true
    }
}, {
    timestamps: true, // Adds createdAt and updatedAt
    collection: 'devices'
});

// Create indexes using schema.index() method
deviceSchema.index({ deviceId: 1 }); // Primary device identifier
deviceSchema.index({ uniqueId: 1 }); // Unique identifier  
deviceSchema.index({ serialNumber: 1 }); // Serial number
deviceSchema.index({ status: 1 }); // Device status
deviceSchema.index({ lastSeen: 1 }); // Last seen timestamp
deviceSchema.index({ ipAddress: 1, port: 1 }); // Network identification (compound)
deviceSchema.index({ deviceId: 1, status: 1 }); // Compound index for common queries
deviceSchema.index({ deviceName: 'text' }); // Text search index for name

// Pre-save middleware for additional validation and data processing
deviceSchema.pre('save', function(next) {
    // Ensure capabilities array has at least one item for new devices
    if (this.isNew && (!this.capabilities || this.capabilities.length === 0)) {
        this.capabilities = ['video', 'audio'];
    }
    
    // Convert MAC address to uppercase format
    if (this.macAddress) {
        this.macAddress = this.macAddress.toUpperCase().replace(/-/g, ':');
    }
    
    // Ensure deviceId is set (should be handled in service, but safety check)
    if (!this.deviceId) {
        return next(new Error('Device ID is required'));
    }
    
    next();
});

// Instance methods
deviceSchema.methods.isOnline = function(): boolean {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    return this.status === 'online' && this.lastSeen > fiveMinutesAgo;
};

deviceSchema.methods.updateLastSeen = function() {
    this.lastSeen = new Date();
    return this.save();
};

deviceSchema.methods.toPublicJSON = function() {
    const obj = this.toObject();
    // Remove sensitive fields if any
    delete obj.__v;
    return obj;
};

// Static methods
deviceSchema.statics.findOnline = function() {
    return this.find({ status: 'online' });
};

deviceSchema.statics.findByCapability = function(capability: string) {
    return this.find({ capabilities: capability });
};

deviceSchema.statics.findByIP = function(ipAddress: string) {
    return this.find({ ipAddress });
};

deviceSchema.statics.markStaleDevicesOffline = function(minutes: number = 5) {
    const cutoff = new Date(Date.now() - minutes * 60 * 1000);
    return this.updateMany(
        { 
            lastSeen: { $lt: cutoff }, 
            status: { $ne: 'offline' } 
        },
        { status: 'offline' }
    );
};

deviceSchema.statics.findByIdentifier = function(identifier: string) {
    return this.findOne({
        $or: [
            { deviceId: identifier },
            { uniqueId: identifier },
            { serialNumber: identifier }
        ]
    });
};

// Export the model with proper typing
export const DeviceModel = mongoose.model<DeviceDocument, DeviceModel>('Device', deviceSchema);

// Export the DeviceDocument interface for use in services
export type { DeviceDocument };