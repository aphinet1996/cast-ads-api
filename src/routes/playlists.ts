import { Router } from 'express';
import { PlaylistService } from '../services/playlist.service';
import Joi from 'joi';

const router = Router();

// Validation schemas
const playlistItemSchema = Joi.object({
    mediaId: Joi.string().required(),
    duration: Joi.number().integer().min(1).max(300).required(),
    transition: Joi.string().valid('fade', 'slide', 'none').default('fade')
});

const validateCreatePlaylist = (req: any, res: any, next: any) => {
    const schema = Joi.object({
        name: Joi.string().required().min(1).max(255),
        items: Joi.array().items(playlistItemSchema).min(1).required(),
        loop: Joi.boolean().default(true)
    });

    const { error, value } = schema.validate(req.body);
    if (error) {
        return res.status(400).json({
            success: false,
            error: error.details[0].message
        });
    }
    req.body = value;
    next();
};

const validateCastPlaylist = (req: any, res: any, next: any) => {
    const schema = Joi.object({
        playlistId: Joi.string().required(),
        deviceId: Joi.string().required(),
        options: Joi.object({
            autoplay: Joi.boolean().default(true),
            volume: Joi.number().min(0).max(100).default(50)
        }).optional()
    });

    const { error, value } = schema.validate(req.body);
    if (error) {
        return res.status(400).json({
            success: false,
            error: error.details[0].message
        });
    }
    req.body = value;
    next();
};

// GET /api/playlists - Get all playlists
router.get('/', async (req, res) => {
    try {
        const { search } = req.query;

        let playlists;
        if (search) {
            playlists = await PlaylistService.searchPlaylists(search as string);
        } else {
            playlists = await PlaylistService.getAllPlaylists();
        }

        res.json({ success: true, data: playlists });
    } catch (error: any) {
        console.error('Error fetching playlists:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch playlists'
        });
    }
});

// POST /api/playlists - Create new playlist
router.post('/', validateCreatePlaylist, async (req, res) => {
    try {
        const playlist = await PlaylistService.createPlaylist(req.body);
        res.status(201).json({ success: true, data: playlist });
    } catch (error: any) {
        console.error('Error creating playlist:', error);

        if (error.message.includes('not found')) {
            return res.status(404).json({ success: false, error: error.message });
        }

        res.status(500).json({
            success: false,
            error: error.message || 'Failed to create playlist'
        });
    }
});

// GET /api/playlists/:id - Get playlist by ID
router.get('/:id', async (req, res) => {
    try {
        const playlist = await PlaylistService.getPlaylistById(req.params.id);

        if (!playlist) {
            return res.status(404).json({
                success: false,
                error: 'Playlist not found'
            });
        }

        res.json({ success: true, data: playlist });
    } catch (error: any) {
        console.error('Error fetching playlist:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch playlist'
        });
    }
});

// PUT /api/playlists/:id - Update playlist
router.put('/:id', validateCreatePlaylist, async (req, res) => {
    try {
        const playlist = await PlaylistService.updatePlaylist(req.params.id, req.body);

        if (!playlist) {
            return res.status(404).json({
                success: false,
                error: 'Playlist not found'
            });
        }

        res.json({ success: true, data: playlist });
    } catch (error: any) {
        console.error('Error updating playlist:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update playlist'
        });
    }
});

// DELETE /api/playlists/:id - Delete playlist
router.delete('/:id', async (req, res) => {
    try {
        await PlaylistService.deletePlaylist(req.params.id);
        res.json({ success: true, message: 'Playlist deleted successfully' });
    } catch (error: any) {
        console.error('Error deleting playlist:', error);

        if (error.message === 'Playlist not found') {
            return res.status(404).json({ success: false, error: error.message });
        }

        res.status(500).json({
            success: false,
            error: 'Failed to delete playlist'
        });
    }
});

// POST /api/playlists/cast - Cast playlist to device
// router.post('/cast', validateCastPlaylist, async (req, res) => {
//     try {
//         const { playlistId, deviceId, options } = req.body;

//         await PlaylistService.castPlaylist(playlistId, deviceId, options);

//         res.json({
//             success: true,
//             message: 'Playlist cast successfully',
//             data: { playlistId, deviceId }
//         });
//     } catch (error: any) {
//         console.error('Error casting playlist:', error);

//         if (error.message.includes('not found') || error.message.includes('not online')) {
//             return res.status(400).json({ success: false, error: error.message });
//         }

//         res.status(500).json({
//             success: false,
//             error: error.message || 'Failed to cast playlist'
//         });
//     }
// });
// POST /api/playlists/cast - Cast playlist to device
router.post('/cast', validateCastPlaylist, async (req, res) => {
    try {
        const { playlistId, deviceId, options } = req.body;

        await PlaylistService.castPlaylist(playlistId, deviceId, options);

        res.json({
            success: true,
            message: 'Playlist cast successfully',
            data: {
                playlistId,
                deviceId,
                playlistName: req.body.name || 'Unknown Playlist',
                options: options || { autoplay: true, volume: 50 }
            }
        });
    } catch (error: any) {
        console.error('Error casting playlist:', error);

        if (error.message.includes('not found') || error.message.includes('not online')) {
            return res.status(400).json({ success: false, error: error.message });
        }

        res.status(500).json({
            success: false,
            error: error.message || 'Failed to cast playlist'
        });
    }
});

export const playlistRoutes = router;