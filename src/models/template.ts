import mongoose, { Schema, Document } from 'mongoose';
import { MediaFile } from '../types';

export interface Template {
    id: string;
    name: string;
    type: 'split-horizontal' | 'quad' | 'fullscreen';
    images: { [key: number]: MediaFile };
    width: number;
    height: number;
    thumbnail?: string;
    createdAt: Date;
    updatedAt: Date;
}

interface TemplateDocument extends Document {
    templateId: string;
    name: string;
    type: 'split-horizontal' | 'quad' | 'fullscreen';
    images: { [key: number]: MediaFile };
    width: number;
    height: number;
    thumbnail?: string;
    createdAt: Date;
    updatedAt: Date;
}

const templateSchema = new Schema<TemplateDocument>({
    templateId: {
        type: String,
        required: [true, 'Template ID is required'],
        unique: true,
        index: true
    },
    name: {
        type: String,
        required: [true, 'Template name is required'],
        trim: true,
        maxlength: [255, 'Template name cannot exceed 255 characters']
    },
    type: {
        type: String,
        enum: {
            values: ['split-horizontal', 'quad', 'fullscreen'],
            message: 'Template type must be one of: split-horizontal, quad, fullscreen'
        },
        required: [true, 'Template type is required']
    },
    images: {
        type: Schema.Types.Mixed,
        required: [true, 'Template images are required'],
        validate: {
            validator: function(images: any) {
                return typeof images === 'object' && images !== null;
            },
            message: 'Images must be an object'
        }
    },
    width: {
        type: Number,
        required: [true, 'Template width is required'],
        min: [1, 'Width must be greater than 0']
    },
    height: {
        type: Number,
        required: [true, 'Template height is required'],
        min: [1, 'Height must be greater than 0']
    },
    thumbnail: {
        type: String,
        default: null
    }
}, {
    timestamps: true,
    collection: 'templates'
});

// Add indexes for better performance
templateSchema.index({ type: 1 });
templateSchema.index({ createdAt: -1 });
templateSchema.index({ name: 1 });

// Virtual field for id
templateSchema.virtual('id').get(function() {
    return this.templateId;
});

// Transform function for JSON output
templateSchema.set('toJSON', {
    virtuals: true,
    transform: function(doc, ret) {
        ret.id = ret.templateId;
        const { _id, __v, templateId, ...cleanedRet } = ret;
        return cleanedRet;
    }
});

export const TemplateModel = mongoose.model<TemplateDocument>('Template', templateSchema);