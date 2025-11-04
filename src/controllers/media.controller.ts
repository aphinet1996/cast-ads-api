import { Request, Response } from 'express';
import { MediaService } from '../services/media.service';

export class MediaFileController {
    /**
     * GET /api/media
     * Get all media files with optional filters
     */
    static async getAllMediaFiles(req: Request, res: Response) {
        try {
            const { type, search, limit } = req.query;
            
            const mediaFiles = await MediaService.getAllMediaFiles({
                type: type as string,
                search: search as string,
                limit: limit ? parseInt(limit as string) : undefined
            });

            res.json({
                success: true,
                count: mediaFiles.length,
                data: mediaFiles
            });
        } catch (error: any) {
            res.status(500).json({
                success: false,
                message: 'Error fetching media files',
                error: error.message
            });
        }
    }

    /**
     * GET /api/media/stats
     * Get media statistics
     */
    static async getMediaStats(req: Request, res: Response) {
        try {
            const stats = await MediaService.getMediaStats();

            res.json({
                success: true,
                data: stats
            });
        } catch (error: any) {
            res.status(500).json({
                success: false,
                message: 'Error fetching media stats',
                error: error.message
            });
        }
    }

    /**
     * GET /api/media/recent
     * Get recent media files
     */
    static async getRecentMediaFiles(req: Request, res: Response) {
        try {
            const { limit = 10 } = req.query;
            const mediaFiles = await MediaService.getRecentMediaFiles(parseInt(limit as string));

            res.json({
                success: true,
                count: mediaFiles.length,
                data: mediaFiles
            });
        } catch (error: any) {
            res.status(500).json({
                success: false,
                message: 'Error fetching recent media files',
                error: error.message
            });
        }
    }

    /**
     * GET /api/media/type/:type
     * Get media files by type
     */
    static async getMediaFilesByType(req: Request, res: Response) {
        try {
            const { type } = req.params;
            const mediaFiles = await MediaService.findByType(type);

            res.json({
                success: true,
                count: mediaFiles.length,
                data: mediaFiles
            });
        } catch (error: any) {
            res.status(500).json({
                success: false,
                message: 'Error fetching media files by type',
                error: error.message
            });
        }
    }

    /**
     * GET /api/media/search
     * Search media files
     */
    static async searchMediaFiles(req: Request, res: Response) {
        try {
            const { q } = req.query;

            if (!q) {
                return res.status(400).json({
                    success: false,
                    message: 'Search query parameter "q" is required'
                });
            }

            const mediaFiles = await MediaService.searchMediaFiles(q as string);

            res.json({
                success: true,
                count: mediaFiles.length,
                data: mediaFiles
            });
        } catch (error: any) {
            res.status(500).json({
                success: false,
                message: 'Error searching media files',
                error: error.message
            });
        }
    }

    /**
     * GET /api/media/:mediaId
     * Get media file by ID
     */
    static async getMediaFileById(req: Request, res: Response) {
        try {
            const { mediaId } = req.params;
            const mediaFile = await MediaService.findByMediaId(mediaId);

            if (!mediaFile) {
                return res.status(404).json({
                    success: false,
                    message: 'Media file not found'
                });
            }

            res.json({
                success: true,
                data: MediaService.toPublicJSON(mediaFile)
            });
        } catch (error: any) {
            res.status(500).json({
                success: false,
                message: 'Error fetching media file',
                error: error.message
            });
        }
    }

    /**
     * POST /api/media
     * Create new media file
     */
    static async createMediaFile(req: Request, res: Response) {
        try {
            const mediaData = req.body;

            if (!mediaData.mediaId) {
                return res.status(400).json({
                    success: false,
                    message: 'Media ID is required'
                });
            }

            const mediaFile = await MediaService.createMediaFile(mediaData);

            res.status(201).json({
                success: true,
                message: 'Media file created successfully',
                data: MediaService.toPublicJSON(mediaFile)
            });
        } catch (error: any) {
            res.status(500).json({
                success: false,
                message: 'Error creating media file',
                error: error.message
            });
        }
    }

    /**
     * PUT /api/media/:mediaId
     * Update media file
     */
    static async updateMediaFile(req: Request, res: Response) {
        try {
            const { mediaId } = req.params;
            const updateData = req.body;

            const mediaFile = await MediaService.updateMediaFile(mediaId, updateData);

            if (!mediaFile) {
                return res.status(404).json({
                    success: false,
                    message: 'Media file not found'
                });
            }

            res.json({
                success: true,
                message: 'Media file updated successfully',
                data: MediaService.toPublicJSON(mediaFile)
            });
        } catch (error: any) {
            res.status(500).json({
                success: false,
                message: 'Error updating media file',
                error: error.message
            });
        }
    }

    /**
     * DELETE /api/media/:mediaId
     * Delete media file
     */
    static async deleteMediaFile(req: Request, res: Response) {
        try {
            const { mediaId } = req.params;
            const mediaFile = await MediaService.deleteMediaFile(mediaId);

            if (!mediaFile) {
                return res.status(404).json({
                    success: false,
                    message: 'Media file not found'
                });
            }

            res.json({
                success: true,
                message: 'Media file deleted successfully'
            });
        } catch (error: any) {
            res.status(500).json({
                success: false,
                message: 'Error deleting media file',
                error: error.message
            });
        }
    }
}