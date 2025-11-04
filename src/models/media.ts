import mongoose, { Schema, Document } from 'mongoose';
import { MediaFile as IMediaFile } from '../types';

export interface MediaFileDocument extends IMediaFile, Document {}

const mediaFileSchema = new Schema<MediaFileDocument>({
    mediaId: {
        type: String,
        required: [true, 'Media ID is required'],
        unique: true,
        index: true
    },
    name: {
        type: String,
        required: [true, 'Name is required']
    },
    originalName: {
        type: String,
        required: [true, 'Original name is required']
    },
    path: {
        type: String,
        required: [true, 'Path is required']
    },
    url: {
        type: String,
        required: [true, 'URL is required']
    },
    type: {
        type: String,
        enum: {
            values: ['video', 'audio', 'image', 'document', 'presentation'],
            message: 'Type must be one of: video, audio, image, document, presentation'
        },
        required: [true, 'Type is required']
    },
    mimeType: {
        type: String,
        required: [true, 'MIME type is required']
    },
    size: {
        type: Number,
        required: [true, 'Size is required'],
        min: [0, 'Size must be positive']
    },
    duration: {
        type: Number,
        min: [0, 'Duration must be positive']
    },
    thumbnail: {
        type: String
    },
    metadata: {
        width: { type: Number },
        height: { type: Number },
        bitrate: { type: Number },
        codec: { type: String }
    },
    uploadedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true,
    collection: 'mediafiles'
});

mediaFileSchema.index({ type: 1 });
mediaFileSchema.index({ uploadedAt: -1 });

export const MediaFileModel = mongoose.model<MediaFileDocument>('MediaFile', mediaFileSchema);