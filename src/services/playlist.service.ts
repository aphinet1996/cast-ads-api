import { PlaylistModel, Playlist, PlaylistItem } from '../models/playlist';
import { MediaService } from './media.service';
import { DeviceService } from './device.service';
import { SocketManager } from './socket.service';
import { v4 as uuidv4 } from 'uuid';

export class PlaylistService {
    static async createPlaylist(data: {
        name: string;
        items: PlaylistItem[];
        loop: boolean;
    }): Promise<Playlist> {
        const playlistId = uuidv4();
        const totalDuration = data.items.reduce((sum, item) => sum + item.duration, 0);

        // Validate all media files exist
        for (const item of data.items) {
            const media = await MediaService.getMediaFileById(item.mediaId);
            if (!media) {
                throw new Error(`Media file not found: ${item.mediaId}`);
            }
        }

        const playlist = new PlaylistModel({
            playlistId,
            name: data.name,
            items: data.items,
            loop: data.loop,
            totalDuration
        });

        const saved = await playlist.save();
        return this.transformPlaylist(saved);
    }

    static async getAllPlaylists(): Promise<Playlist[]> {
        const playlists = await PlaylistModel.find({})
            .sort({ createdAt: -1 })
            .lean();

        return playlists.map(p => this.transformPlaylist(p));
    }

    static async getPlaylistById(playlistId: string): Promise<Playlist | null> {
        const playlist = await PlaylistModel.findOne({ playlistId }).lean();
        return playlist ? this.transformPlaylist(playlist) : null;
    }

    static async updatePlaylist(
        playlistId: string,
        data: Partial<{
            name: string;
            items: PlaylistItem[];
            loop: boolean;
        }>
    ): Promise<Playlist | null> {
        let totalDuration: number | undefined;

        if (data.items) {
            totalDuration = data.items.reduce((sum, item) => sum + item.duration, 0);
        }

        const updated = await PlaylistModel.findOneAndUpdate(
            { playlistId },
            {
                ...data,
                ...(totalDuration !== undefined && { totalDuration })
            },
            { new: true }
        );

        return updated ? this.transformPlaylist(updated) : null;
    }

    static async deletePlaylist(playlistId: string): Promise<void> {
        const playlist = await PlaylistModel.findOne({ playlistId });
        if (!playlist) {
            throw new Error('Playlist not found');
        }

        await PlaylistModel.deleteOne({ playlistId });
    }

    //   static async castPlaylist(playlistId: string, deviceId: string, options?: any): Promise<void> {
    //     const playlist = await PlaylistModel.findOne({ playlistId });
    //     if (!playlist) {
    //       throw new Error('Playlist not found');
    //     }

    //     const device = await DeviceService.getDeviceById(deviceId);
    //     if (!device) {
    //       throw new Error('Device not found');
    //     }

    //     if (device.status !== 'online') {
    //       throw new Error('Device is not online');
    //     }

    //     // Fetch full media details for each item
    //     const itemsWithMedia = await Promise.all(
    //       playlist.items.map(async (item) => {
    //         const media = await MediaService.getMediaFileById(item.mediaId);
    //         return {
    //           mediaId: item.mediaId,
    //           duration: item.duration,
    //           transition: item.transition,
    //           media: media
    //         };
    //       })
    //     );

    //     const playlistData = {
    //       playlistId: playlist.playlistId,
    //       name: playlist.name,
    //       items: itemsWithMedia,
    //       loop: playlist.loop,
    //       totalDuration: playlist.totalDuration,
    //       options: options || { autoplay: true }
    //     };

    //     // Send via socket
    //     const socketManager = SocketManager.getInstance();
    //     const success = (socketManager as any).castPlaylist(deviceId, playlistData);

    //     if (success) {
    //       await DeviceService.updateDeviceStatus(deviceId, 'busy');
    //     } else {
    //       throw new Error('Failed to cast playlist to device');
    //     }
    //   }

    static async castPlaylist(playlistId: string, deviceId: string, options?: any): Promise<void> {
        const playlist = await PlaylistModel.findOne({ playlistId });
        if (!playlist) {
            throw new Error('Playlist not found');
        }

        const device = await DeviceService.getDeviceById(deviceId);
        if (!device) {
            throw new Error('Device not found');
        }

        if (device.status !== 'online') {
            throw new Error('Device is not online');
        }

        // Fetch full media details for each item
        type PlaylistItemWithMedia = {
            mediaId: string;
            duration: number;
            transition: 'fade' | 'slide' | 'none';
            media: {
                mediaId: string;
                name: string;
                url: string;
                type: string;
                mimeType: string;
                size: number;
                thumbnail?: string;
            };
        };

        const itemsWithMedia: Array<PlaylistItemWithMedia | null> = await Promise.all(
            playlist.items.map(async (item) => {
                const media = await MediaService.getMediaFileById(item.mediaId);

                if (!media) {
                    console.error(`Media not found: ${item.mediaId}`);
                    return null;
                }

                return {
                    mediaId: item.mediaId,
                    duration: item.duration,
                    transition: item.transition,
                    media: {
                        mediaId: media.mediaId,
                        name: media.name,
                        url: media.url,
                        type: media.type,
                        mimeType: media.mimeType,
                        size: media.size,
                        thumbnail: media.thumbnail
                    }
                };
            })
        );

        // Filter out null values (media not found)
        const validItems = itemsWithMedia.filter(
            (item): item is PlaylistItemWithMedia => item !== null
        );

        if (validItems.length === 0) {
            throw new Error('No valid media files found in playlist');
        }

        const playlistData = {
            playlistId: playlist.playlistId,
            name: playlist.name,
            items: validItems,
            loop: playlist.loop,
            totalDuration: playlist.totalDuration,
            options: options || { autoplay: true, volume: 50 }
        };

        // Send via socket
        const socketManager = SocketManager.getInstance();
        const success = socketManager.castPlaylist(deviceId, playlistData);

        if (success) {
            console.log('Playlist cast command sent successfully via socket');
            await DeviceService.updateDeviceStatus(deviceId, 'busy');
        } else {
            console.error('[Failed to send playlist cast command');
            throw new Error('Failed to cast playlist to device');
        }
    }

    static async searchPlaylists(query: string): Promise<Playlist[]> {
        const playlists = await PlaylistModel.find({
            name: { $regex: query, $options: 'i' }
        })
            .sort({ createdAt: -1 })
            .lean();

        return playlists.map(p => this.transformPlaylist(p));
    }

    private static transformPlaylist(playlist: any): Playlist {
        return {
            id: playlist.playlistId,
            name: playlist.name,
            items: playlist.items,
            loop: playlist.loop,
            totalDuration: playlist.totalDuration,
            createdAt: playlist.createdAt,
            updatedAt: playlist.updatedAt
        };
    }
}