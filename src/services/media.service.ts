// import { MediaFileModel } from '../models/media';
// import { MediaFile } from '../types';
// import { v4 as uuidv4 } from 'uuid';
// import path from 'path';
// import fs from 'fs/promises';

// export class MediaService {
    // static async saveMediaFile(fileInfo: {
    //     originalName: string;
    //     filename: string;
    //     path: string;
    //     size: number;
    //     mimeType: string;
    // }): Promise<MediaFile> {
    //     const mediaId = uuidv4();
    //     const baseUrl = process.env.BASE_URL;

    //     // Determine media type based on mime type
    //     const type = MediaService.getMediaType(fileInfo.mimeType);

    //     try {
    //         const mediaFile = new MediaFileModel({
    //             mediaId: mediaId,
    //             name: path.parse(fileInfo.originalName).name,
    //             originalName: fileInfo.originalName,
    //             path: fileInfo.path,
    //             url: `${baseUrl}/media/${fileInfo.filename}`,
    //             type: type,
    //             mimeType: fileInfo.mimeType,
    //             size: fileInfo.size,
    //             metadata: {},
    //             uploadedAt: new Date()
    //         });

    //         console.log('Creating media file with data:', {
    //             mediaId,
    //             name: path.parse(fileInfo.originalName).name,
    //             originalName: fileInfo.originalName,
    //             type,
    //             size: fileInfo.size
    //         });

    //         const saved = await mediaFile.save();
    //         console.log('Media file saved successfully:', saved.mediaId);

    //         return this.transformMediaFile(saved);
    //     } catch (error) {
    //         console.error('Error saving media file:', error);
    //         throw error;
    //     }
    // }

//     static async getAllMediaFiles(): Promise<MediaFile[]> {
//         const files = await MediaFileModel.find({}).lean();
//         return files.map(file => this.transformMediaFile(file));
//     }

//     static async getMediaFileById(mediaId: string): Promise<MediaFile | null> {
//         const file = await MediaFileModel.findOne({ mediaId }).lean();
//         return file ? this.transformMediaFile(file) : null;
//     }

//     static async deleteMediaFile(mediaId: string): Promise<void> {
//         const mediaFile = await MediaFileModel.findOne({ mediaId });
//         if (mediaFile) {
//             // Delete physical file
//             try {
//                 await fs.unlink(mediaFile.path);
//                 if (mediaFile.thumbnail) {
//                     await fs.unlink(mediaFile.thumbnail);
//                 }
//             } catch (error) {
//                 console.error('Error deleting file:', error);
//             }

//             // Delete from database
//             await MediaFileModel.deleteOne({ mediaId });
//         }
//     }

//     private static getMediaType(mimeType: string): MediaFile['type'] {
//         if (mimeType.startsWith('video/')) return 'video';
//         if (mimeType.startsWith('audio/')) return 'audio';
//         if (mimeType.startsWith('image/')) return 'image';
//         if (mimeType.includes('pdf')) return 'document';
//         if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return 'presentation';
//         return 'document';
//     }

//     private static transformMediaFile(file: any): MediaFile {
//         return {
//             mediaId: file.mediaId,
//             name: file.name,
//             originalName: file.originalName,
//             path: file.path,
//             url: file.url,
//             type: file.type,
//             mimeType: file.mimeType,
//             size: file.size,
//             duration: file.duration,
//             thumbnail: file.thumbnail,
//             metadata: file.metadata,
//             uploadedAt: file.uploadedAt
//         };
//     }

//     static async updateMediaDuration(mediaId: string, duration: number): Promise<void> {
//         await MediaFileModel.updateOne(
//             { mediaId },
//             { duration }
//         );
//     }
// }

import { MediaFileModel, MediaFileDocument } from '../models/media';
import { MediaFile } from '../types';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

export class MediaService {
    /**
     * Get all media files with optional filters
     */
    static async getAllMediaFiles(filters: {
        type?: string;
        search?: string;
        limit?: number;
    } = {}): Promise<MediaFileDocument[]> {
        const query: any = {};

        if (filters.type) {
            query.type = filters.type;
        }

        if (filters.search) {
            query.$or = [
                { name: { $regex: filters.search, $options: 'i' } },
                { originalName: { $regex: filters.search, $options: 'i' } }
            ];
        }

        const queryBuilder = MediaFileModel.find(query).sort({ uploadedAt: -1 });

        if (filters.limit) {
            queryBuilder.limit(filters.limit);
        }

        return await queryBuilder;
    }

    /**
     * Find media file by ID
     */
    static async findByMediaId(mediaId: string): Promise<MediaFileDocument | null> {
        return await MediaFileModel.findOne({ mediaId });
    }

    /**
     * Find media files by type
     */
    static async findByType(type: string): Promise<MediaFileDocument[]> {
        return await MediaFileModel.find({ type });
    }

    /**
     * Create new media file
     */
    // static async createMediaFile(mediaData: Partial<MediaFile>): Promise<MediaFileDocument> {
    //     const newMedia = new MediaFileModel(mediaData);
    //     return await newMedia.save();
    // }
    static async createMediaFile(fileInfo: {
        originalName: string;
        name: string;
        path: string;
        size: number;
        mimeType: string;
        duration?: number;
    }): Promise<MediaFileDocument> {
        const mediaId = uuidv4();
        
        // Extract filename from path
        const filename = path.basename(fileInfo.path);
        const baseUrl = process.env.BASE_URL;
        
        // Determine media type based on mime type
        const type = MediaService.getMediaType(fileInfo.mimeType);

        try {
            const mediaFile = new MediaFileModel({
                mediaId: mediaId,
                name: fileInfo.name,
                originalName: fileInfo.originalName,
                path: fileInfo.path,
                url: `${baseUrl}/media/${filename}`,
                type: type,
                mimeType: fileInfo.mimeType,
                size: fileInfo.size,
                duration: fileInfo.duration,
                metadata: {},
                uploadedAt: new Date()
            });

            console.log('Creating media file with data:', {
                mediaId,
                name: fileInfo.name,
                originalName: fileInfo.originalName,
                type,
                size: fileInfo.size,
                url: `${baseUrl}/media/${filename}`
            });

            const saved = await mediaFile.save();
            console.log('Media file saved successfully:', saved.mediaId);

            return saved;
        } catch (error) {
            console.error('Error saving media file:', error);
            throw error;
        }
    }

    /**
     * Update media file
     */
    static async updateMediaFile(
        mediaId: string,
        updateData: Partial<MediaFile>
    ): Promise<MediaFileDocument | null> {
        return await MediaFileModel.findOneAndUpdate(
            { mediaId },
            updateData,
            { new: true }
        );
    }

    /**
     * Delete media file
     */
    static async deleteMediaFile(mediaId: string): Promise<MediaFileDocument | null> {
        return await MediaFileModel.findOneAndDelete({ mediaId });
    }

    /**
     * Get media statistics
     */
    static async getMediaStats() {
        const total = await MediaFileModel.countDocuments();

        const byType = {
            video: await MediaFileModel.countDocuments({ type: 'video' }),
            audio: await MediaFileModel.countDocuments({ type: 'audio' }),
            image: await MediaFileModel.countDocuments({ type: 'image' }),
            document: await MediaFileModel.countDocuments({ type: 'document' }),
            presentation: await MediaFileModel.countDocuments({ type: 'presentation' })
        };

        const totalSizeResult = await MediaFileModel.aggregate([
            { $group: { _id: null, totalSize: { $sum: '$size' } } }
        ]);

        const totalSize = totalSizeResult.length > 0 ? totalSizeResult[0].totalSize : 0;

        return {
            total,
            totalSize,
            byType
        };
    }

    /**
     * Search media files
     */
    static async searchMediaFiles(searchTerm: string): Promise<MediaFileDocument[]> {
        return await MediaFileModel.find({
            $or: [
                { name: { $regex: searchTerm, $options: 'i' } },
                { originalName: { $regex: searchTerm, $options: 'i' } }
            ]
        }).sort({ uploadedAt: -1 });
    }

    /**
     * Get recent media files
     */
    static async getRecentMediaFiles(limit: number = 10): Promise<MediaFileDocument[]> {
        return await MediaFileModel.find()
            .sort({ uploadedAt: -1 })
            .limit(limit);
    }

    private static getMediaType(mimeType: string): MediaFile['type'] {
        if (mimeType.startsWith('video/')) return 'video';
        if (mimeType.startsWith('audio/')) return 'audio';
        if (mimeType.startsWith('image/')) return 'image';
        if (mimeType.includes('pdf')) return 'document';
        if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return 'presentation';
        return 'document';
    }

    /**
     * Convert media file to public JSON (remove sensitive data)
     */
    static toPublicJSON(media: MediaFileDocument) {
        const obj = media.toObject ? media.toObject() : media;
        delete obj.__v;
        return obj;
    }
}