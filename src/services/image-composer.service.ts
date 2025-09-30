import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';

export interface GridComposerConfig {
  type: 'split-horizontal' | 'quad' | 'fullscreen';
  images: { [slot: number]: string };
  width: number;
  height: number;
}

export class ImageComposerService {
  static async createGridComposite(config: GridComposerConfig): Promise<{ 
    path: string; 
    filename: string;
    size: number;
  }> {
    
    const outputFilename = `composite-${uuidv4()}.jpg`;
    const outputPath = path.join(__dirname, '../../uploads', outputFilename);
    
    // Create blank canvas
    const canvas = sharp({
      create: {
        width: config.width,
        height: config.height,
        channels: 3,
        background: { r: 255, g: 255, b: 255 }
      }
    });
    
    const composites: sharp.OverlayOptions[] = [];
    
    switch (config.type) {
      case 'split-horizontal':
        await this.createSplitHorizontalLayout(config, composites);
        break;
        
      case 'quad':
        await this.createQuadLayout(config, composites);
        break;
        
      case 'fullscreen':
        await this.createFullscreenLayout(config, composites);
        break;
    }
    
    // Composite all images
    await canvas
      .composite(composites)
      .jpeg({ quality: 90 })
      .toFile(outputPath);
    
    // Get file size
    const stats = await fs.stat(outputPath);
    
    return { 
      path: outputPath, 
      filename: outputFilename,
      size: stats.size
    };
  }
  
  private static async createSplitHorizontalLayout(
    config: GridComposerConfig,
    composites: sharp.OverlayOptions[]
  ): Promise<void> {
    const halfHeight = Math.floor(config.height / 2);
    
    // Slot 0: Top half
    if (config.images[0]) {
      const topImage = await sharp(config.images[0])
        .resize(config.width, halfHeight, { fit: 'cover' })
        .toBuffer();
      
      composites.push({
        input: topImage,
        top: 0,
        left: 0
      });
    }
    
    // Slot 1: Bottom half
    if (config.images[1]) {
      const bottomImage = await sharp(config.images[1])
        .resize(config.width, halfHeight, { fit: 'cover' })
        .toBuffer();
      
      composites.push({
        input: bottomImage,
        top: halfHeight,
        left: 0
      });
    }
  }
  
  private static async createQuadLayout(
    config: GridComposerConfig,
    composites: sharp.OverlayOptions[]
  ): Promise<void> {
    const slotWidth = Math.floor(config.width / 2);
    const slotHeight = Math.floor(config.height / 2);
    
    const positions = [
      { top: 0, left: 0 },
      { top: 0, left: slotWidth },
      { top: slotHeight, left: 0 },
      { top: slotHeight, left: slotWidth }
    ];
    
    for (let i = 0; i < 4; i++) {
      if (config.images[i]) {
        const resized = await sharp(config.images[i])
          .resize(slotWidth, slotHeight, { fit: 'cover' })
          .toBuffer();
        
        composites.push({
          input: resized,
          ...positions[i]
        });
      }
    }
  }
  
  private static async createFullscreenLayout(
    config: GridComposerConfig,
    composites: sharp.OverlayOptions[]
  ): Promise<void> {
    if (config.images[0]) {
      const fullImage = await sharp(config.images[0])
        .resize(config.width, config.height, { fit: 'cover' })
        .toBuffer();
      
      composites.push({
        input: fullImage,
        top: 0,
        left: 0
      });
    }
  }
}