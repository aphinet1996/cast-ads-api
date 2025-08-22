import { Router } from 'express';
import { MediaService } from '../services/media.service';
import { uploadMiddleware } from '../middleware/upload';

const router = Router();

// GET /api/media - Get all media files
router.get('/', async (req, res) => {
  try {
    const mediaFiles = await MediaService.getAllMediaFiles();
    res.json({ success: true, data: mediaFiles });
  } catch (error) {
    console.error('Error fetching media files:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// POST /api/media/upload - Upload media file
router.post('/upload', uploadMiddleware.single('media'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    const mediaFile = await MediaService.saveMediaFile({
      originalName: req.file.originalname,
      filename: req.file.filename,
      path: req.file.path,
      size: req.file.size,
      mimeType: req.file.mimetype
    });

    res.json({ success: true, data: mediaFile });
  } catch (error) {
    console.error('Error uploading media file:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// GET /api/media/:id - Get media file by ID
router.get('/:id', async (req, res) => {
  try {
    const mediaFile = await MediaService.getMediaFileById(req.params.id);
    if (!mediaFile) {
      return res.status(404).json({ success: false, error: 'Media file not found' });
    }
    res.json({ success: true, data: mediaFile });
  } catch (error) {
    console.error('Error fetching media file:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// DELETE /api/media/:id - Delete media file
router.delete('/:id', async (req, res) => {
  try {
    await MediaService.deleteMediaFile(req.params.id);
    res.json({ success: true, message: 'Media file deleted successfully' });
  } catch (error) {
    console.error('Error deleting media file:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export const mediaRoutes = router;