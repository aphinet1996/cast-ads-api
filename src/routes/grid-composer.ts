import { Router } from 'express';
import { ImageComposerService } from '../services/image-composer.service';
import { MediaService } from '../services/media.service';
import Joi from 'joi';

const router = Router();

// Validation middleware
const validateComposeRequest = (req: any, res: any, next: any) => {
  const schema = Joi.object({
    name: Joi.string().required().min(1).max(255),
    type: Joi.string().valid('split-horizontal', 'quad', 'fullscreen').required(),
    slots: Joi.object().pattern(
      Joi.string().pattern(/^[0-9]+$/),
      Joi.string().required()
    ).required(),
    width: Joi.number().integer().min(1).max(10000).required(),
    height: Joi.number().integer().min(1).max(10000).required()
  });
  
  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      error: error.details[0].message
    });
  }
  next();
};

// POST /api/grid-composer/compose - Create composite image
router.post('/compose', validateComposeRequest, async (req, res) => {
  try {
    const { name, type, slots, width, height } = req.body;
    
    // Convert mediaIds to file paths
    const imagePaths: { [key: number]: string } = {};
    for (const [slot, mediaId] of Object.entries(slots)) {
      const media = await MediaService.getMediaFileById(mediaId as string);
      if (!media) {
        return res.status(404).json({
          success: false,
          error: `Media file not found for slot ${slot}: ${mediaId}`
        });
      }
      imagePaths[parseInt(slot)] = media.path;
    }
    
    // Create composite image
    const result = await ImageComposerService.createGridComposite({
      type,
      images: imagePaths,
      width,
      height
    });
    
    // Save as new media file
    const mediaFile = await MediaService.saveMediaFile({
      originalName: `${name}.jpg`,
      filename: result.filename,
      path: result.path,
      size: result.size,
      mimeType: 'image/jpeg'
    });
    
    res.json({ 
      success: true, 
      data: mediaFile,
      message: 'Composite image created successfully'
    });
    
  } catch (error: any) {
    console.error('Error composing grid:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to compose grid image'
    });
  }
});

export const gridComposerRoutes = router;