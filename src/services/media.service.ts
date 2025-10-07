import { MediaFileModel } from '../models/media-file';
import { MediaFile } from '../types';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs/promises';

export class MediaService {
    static async saveMediaFile(fileInfo: {
        originalName: string;
        filename: string;
        path: string;
        size: number;
        mimeType: string;
    }): Promise<MediaFile> {
        const mediaId = uuidv4();
        const baseUrl = process.env.BASE_URL;

        // Determine media type based on mime type
        const type = MediaService.getMediaType(fileInfo.mimeType);

        try {
            const mediaFile = new MediaFileModel({
                mediaId: mediaId,
                name: path.parse(fileInfo.originalName).name,
                originalName: fileInfo.originalName,
                path: fileInfo.path,
                url: `${baseUrl}/media/${fileInfo.filename}`,
                type: type,
                mimeType: fileInfo.mimeType,
                size: fileInfo.size,
                metadata: {},
                uploadedAt: new Date()
            });

            console.log('Creating media file with data:', {
                mediaId,
                name: path.parse(fileInfo.originalName).name,
                originalName: fileInfo.originalName,
                type,
                size: fileInfo.size
            });

            const saved = await mediaFile.save();
            console.log('Media file saved successfully:', saved.mediaId);

            return this.transformMediaFile(saved);
        } catch (error) {
            console.error('Error saving media file:', error);
            throw error;
        }
    }

    static async getAllMediaFiles(): Promise<MediaFile[]> {
        const files = await MediaFileModel.find({}).lean();
        return files.map(file => this.transformMediaFile(file));
    }

    static async getMediaFileById(mediaId: string): Promise<MediaFile | null> {
        const file = await MediaFileModel.findOne({ mediaId }).lean();
        return file ? this.transformMediaFile(file) : null;
    }

    static async deleteMediaFile(mediaId: string): Promise<void> {
        const mediaFile = await MediaFileModel.findOne({ mediaId });
        if (mediaFile) {
            // Delete physical file
            try {
                await fs.unlink(mediaFile.path);
                if (mediaFile.thumbnail) {
                    await fs.unlink(mediaFile.thumbnail);
                }
            } catch (error) {
                console.error('Error deleting file:', error);
            }

            // Delete from database
            await MediaFileModel.deleteOne({ mediaId });
        }
    }

    private static getMediaType(mimeType: string): MediaFile['type'] {
        if (mimeType.startsWith('video/')) return 'video';
        if (mimeType.startsWith('audio/')) return 'audio';
        if (mimeType.startsWith('image/')) return 'image';
        if (mimeType.includes('pdf')) return 'document';
        if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return 'presentation';
        return 'document';
    }

    private static transformMediaFile(file: any): MediaFile {
        return {
            mediaId: file.mediaId,
            name: file.name,
            originalName: file.originalName,
            path: file.path,
            url: file.url,
            type: file.type,
            mimeType: file.mimeType,
            size: file.size,
            duration: file.duration,
            thumbnail: file.thumbnail,
            metadata: file.metadata,
            uploadedAt: file.uploadedAt
        };
    }

    static async updateMediaDuration(mediaId: string, duration: number): Promise<void> {
        await MediaFileModel.updateOne(
            { mediaId },
            { duration }
        );
    }
}