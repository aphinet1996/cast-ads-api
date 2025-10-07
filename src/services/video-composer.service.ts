import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';

export interface VideoComposerConfig {
    type: 'split-horizontal' | 'triple' | 'quad' | 'fullscreen';
    media: { [slot: number]: { path: string; type: 'image' | 'video' } };
    width: number;
    height: number;
    duration?: number;
}

export class VideoComposerService {
    // static async createVideoComposite(config: VideoComposerConfig): Promise<{
    //     path: string;
    //     filename: string;
    //     size: number;
    //     duration: number;
    // }> {
    //     const outputFilename = `composite-${uuidv4()}.mp4`;
    //     const outputPath = path.join(__dirname, '../../uploads', outputFilename);
    //     const tempDir = path.join(__dirname, '../../uploads/temp');

    //     await fs.mkdir(tempDir, { recursive: true });

    //     try {

    //         const inputs = await this.prepareInputs(config, tempDir);

    //         console.log('[VIDEO-COMPOSER] Inputs prepared:');
    //         inputs.files.forEach((file, idx) => {
    //             console.log(`  [${idx}] ${file}`);
    //         });
    //         console.log('[VIDEO-COMPOSER] Duration:', inputs.maxDuration, 'seconds');

    //         // สร้าง filter
    //         const filterComplex = this.buildFilterComplex(config, inputs.files.length);
    //         console.log('[VIDEO-COMPOSER] Filter complex:', filterComplex);

    //         const duration = config.duration || inputs.maxDuration;

    //         // Compose
    //         await this.composeWithFFmpeg(inputs.files, filterComplex, duration, outputPath, config);

    //         // Cleanup
    //         await this.cleanupTempFiles(inputs.tempFiles);

    //         const stats = await fs.stat(outputPath);

    //         console.log('[VIDEO-COMPOSER] ✅ Success! Output:', outputFilename);
    //         console.log('[VIDEO-COMPOSER] Size:', (stats.size / 1024 / 1024).toFixed(2), 'MB');

    //         return {
    //             path: outputPath,
    //             filename: outputFilename,
    //             size: stats.size,
    //             duration: duration
    //         };

    //     } catch (error) {
    //         console.error('[VIDEO-COMPOSER] ❌ Error:', error);
    //         try {
    //             await fs.unlink(outputPath);
    //         } catch { }
    //         throw error;
    //     }
    // }

    static async createVideoComposite(config: VideoComposerConfig): Promise<{
        path: string;
        filename: string;
        size: number;
        duration: number;
    }> {
        const outputFilename = `composite-${uuidv4()}.mp4`;
        const outputPath = path.join(__dirname, '../../uploads', outputFilename);
        const tempDir = path.join(__dirname, '../../uploads/temp');

        await fs.mkdir(tempDir, { recursive: true });

        try {
            const inputs = await this.prepareInputs(config, tempDir);

            console.log('[VIDEO-COMPOSER] Inputs prepared:');
            inputs.files.forEach((file, idx) => {
                console.log(`  [${idx}] ${file}`);
            });
            console.log('[VIDEO-COMPOSER] Duration:', inputs.maxDuration, 'seconds');

            const filterComplex = this.buildFilterComplex(config, inputs.files.length);
            console.log('[VIDEO-COMPOSER] Filter complex:', filterComplex);

            const duration = config.duration || inputs.maxDuration;

            // ส่ง audioInputIndex ไปด้วย
            await this.composeWithFFmpeg(
                inputs.files,
                filterComplex,
                duration,
                outputPath,
                config,
                inputs.audioInputIndex  // เพิ่มตรงนี้
            );

            await this.cleanupTempFiles(inputs.tempFiles);

            const stats = await fs.stat(outputPath);

            console.log('[VIDEO-COMPOSER] ✅ Success! Output:', outputFilename);
            console.log('[VIDEO-COMPOSER] Size:', (stats.size / 1024 / 1024).toFixed(2), 'MB');

            return {
                path: outputPath,
                filename: outputFilename,
                size: stats.size,
                duration: duration
            };

        } catch (error) {
            console.error('[VIDEO-COMPOSER] ❌ Error:', error);
            try {
                await fs.unlink(outputPath);
            } catch { }
            throw error;
        }
    }

    // private static async prepareInputs(
    //     config: VideoComposerConfig,
    //     tempDir: string
    // ): Promise<{
    //     files: string[];
    //     tempFiles: string[];
    //     maxDuration: number;
    // }> {
    //     const files: string[] = [];
    //     const tempFiles: string[] = [];
    //     let maxDuration = 5;

    //     // Step 1: หา maxDuration
    //     console.log('[VIDEO-COMPOSER] Step 1: Finding max duration...');
    //     for (const [slot, media] of Object.entries(config.media)) {
    //         if (media.type === 'video') {
    //             const duration = await this.getVideoDuration(media.path);
    //             console.log(`  Video in slot ${slot}: ${duration}s`);
    //             if (duration > maxDuration) {
    //                 maxDuration = duration;
    //             }
    //         }
    //     }
    //     console.log(`  Max duration: ${maxDuration}s`);

    //     // คำนวณขนาดของแต่ละ slot
    //     const { slotWidth, slotHeight } = this.calculateSlotDimensions(config);
    //     console.log(`  Slot dimensions: ${slotWidth}x${slotHeight}`);

    //     // Step 2: เตรียม input files
    //     console.log('[VIDEO-COMPOSER] Step 2: Preparing input files...');
    //     const sortedSlots = Object.keys(config.media)
    //         .map(k => parseInt(k))
    //         .sort((a, b) => a - b);

    //     for (const slot of sortedSlots) {
    //         const media = config.media[slot];

    //         if (media.type === 'video') {
    //             console.log(`  Slot ${slot}: Scaling video - ${media.path}`);

    //             // Scale video ให้มีขนาดเท่ากับ slot
    //             const scaledVideoPath = path.join(tempDir, `scaled-video-${slot}-${uuidv4()}.mp4`);
    //             await this.scaleVideo(media.path, scaledVideoPath, slotWidth, slotHeight, maxDuration);
    //             files.push(scaledVideoPath);
    //             tempFiles.push(scaledVideoPath);
    //             console.log(`    Scaled to: ${scaledVideoPath}`);

    //         } else {
    //             console.log(`  Slot ${slot}: Converting image to video - ${media.path}`);

    //             // แปลง webp/png เป็น jpg
    //             let imagePath = media.path;
    //             if (!media.path.toLowerCase().endsWith('.jpg') && !media.path.toLowerCase().endsWith('.jpeg')) {
    //                 const jpgPath = path.join(tempDir, `converted-${slot}-${uuidv4()}.jpg`);
    //                 await this.convertImageToJpg(media.path, jpgPath);
    //                 imagePath = jpgPath;
    //                 tempFiles.push(jpgPath);
    //                 console.log(`    Converted to JPG: ${jpgPath}`);
    //             }

    //             const videoPath = path.join(tempDir, `image-video-${slot}-${uuidv4()}.mp4`);
    //             await this.imageToVideo(imagePath, videoPath, maxDuration, slotWidth, slotHeight);
    //             files.push(videoPath);
    //             tempFiles.push(videoPath);
    //             console.log(`    Created video: ${videoPath}`);
    //         }
    //     }

    //     console.log('[VIDEO-COMPOSER] ✅ All inputs prepared');
    //     return { files, tempFiles, maxDuration };
    // }

    private static async prepareInputs(
        config: VideoComposerConfig,
        tempDir: string
    ): Promise<{
        files: string[];
        tempFiles: string[];
        maxDuration: number;
        audioInputIndex: number | null; // เพิ่มนี้
    }> {
        const files: string[] = [];
        const tempFiles: string[] = [];
        let maxDuration = 5;
        let audioInputIndex: number | null = null;

        // Step 1: หา maxDuration
        console.log('[VIDEO-COMPOSER] Step 1: Finding max duration...');
        for (const [slot, media] of Object.entries(config.media)) {
            if (media.type === 'video') {
                const duration = await this.getVideoDuration(media.path);
                console.log(`  Video in slot ${slot}: ${duration}s`);
                if (duration > maxDuration) {
                    maxDuration = duration;
                }
            }
        }
        console.log(`  Max duration: ${maxDuration}s`);

        // คำนวณขนาดของแต่ละ slot
        const { slotWidth, slotHeight } = this.calculateSlotDimensions(config);
        console.log(`  Slot dimensions: ${slotWidth}x${slotHeight}`);

        // Step 2: เตรียม input files
        console.log('[VIDEO-COMPOSER] Step 2: Preparing input files...');
        const sortedSlots = Object.keys(config.media)
            .map(k => parseInt(k))
            .sort((a, b) => a - b);

        for (const slot of sortedSlots) {
            const media = config.media[slot];
            const currentFileIndex = files.length;

            if (media.type === 'video') {
                console.log(`  Slot ${slot}: Scaling video - ${media.path}`);

                // ตรวจสอบว่ามี audio หรือไม่
                const hasAudio = await this.hasAudio(media.path);
                console.log(`    Has audio: ${hasAudio}`);

                // ถ้ายังไม่มี audio input และ video นี้มี audio
                if (audioInputIndex === null && hasAudio) {
                    audioInputIndex = currentFileIndex;
                    console.log(`    ✅ Selected as audio source (input ${currentFileIndex})`);
                }

                const scaledVideoPath = path.join(tempDir, `scaled-video-${slot}-${uuidv4()}.mp4`);
                await this.scaleVideo(media.path, scaledVideoPath, slotWidth, slotHeight, maxDuration);
                files.push(scaledVideoPath);
                tempFiles.push(scaledVideoPath);
                console.log(`    Scaled to: ${scaledVideoPath}`);

            } else {
                console.log(`  Slot ${slot}: Converting image to video - ${media.path}`);

                let imagePath = media.path;
                if (!media.path.toLowerCase().endsWith('.jpg') && !media.path.toLowerCase().endsWith('.jpeg')) {
                    const jpgPath = path.join(tempDir, `converted-${slot}-${uuidv4()}.jpg`);
                    await this.convertImageToJpg(media.path, jpgPath);
                    imagePath = jpgPath;
                    tempFiles.push(jpgPath);
                    console.log(`    Converted to JPG: ${jpgPath}`);
                }

                const videoPath = path.join(tempDir, `image-video-${slot}-${uuidv4()}.mp4`);
                await this.imageToVideo(imagePath, videoPath, maxDuration, slotWidth, slotHeight);
                files.push(videoPath);
                tempFiles.push(videoPath);
                console.log(`    Created video: ${videoPath}`);
            }
        }

        console.log('[VIDEO-COMPOSER] ✅ All inputs prepared');
        console.log(`[VIDEO-COMPOSER] Audio source: ${audioInputIndex !== null ? `Input ${audioInputIndex}` : 'None'}`);

        return { files, tempFiles, maxDuration, audioInputIndex };
    }

    private static calculateSlotDimensions(config: VideoComposerConfig): {
        slotWidth: number;
        slotHeight: number;
    } {
        const { width, height, type } = config;

        switch (type) {
            case 'split-horizontal':
                return {
                    slotWidth: width,
                    slotHeight: Math.floor(height / 2)
                };
            case 'triple':
                return {
                    slotWidth: width,
                    slotHeight: Math.floor(height / 3)
                };
            case 'quad':
                return {
                    slotWidth: Math.floor(width / 2),
                    slotHeight: Math.floor(height / 2)
                };
            case 'fullscreen':
                return {
                    slotWidth: width,
                    slotHeight: height
                };
            default:
                throw new Error('Invalid template type');
        }
    }

    // private static scaleVideo(
    //     inputPath: string,
    //     outputPath: string,
    //     width: number,
    //     height: number,
    //     duration: number
    // ): Promise<void> {
    //     return new Promise((resolve, reject) => {
    //         ffmpeg(inputPath)
    //             .videoCodec('libx264')
    //             .size(`${width}x${height}`)
    //             .fps(30)
    //             .outputOptions([
    //                 '-pix_fmt yuv420p',
    //                 '-preset ultrafast',
    //                 '-crf 23',
    //                 `-t ${duration}`
    //             ])
    //             .output(outputPath)
    //             .on('start', (cmd) => {
    //                 console.log('[FFMPEG] Scale video command:', cmd);
    //             })
    //             .on('end', () => {
    //                 console.log('[FFMPEG] ✅ Video scaled');
    //                 resolve();
    //             })
    //             .on('error', (err) => {
    //                 console.error('[FFMPEG] ❌ Error scaling video:', err);
    //                 reject(err);
    //             })
    //             .run();
    //     });
    // }

    private static async scaleVideo(
        inputPath: string,
        outputPath: string,
        width: number,
        height: number,
        duration: number
      ): Promise<void> {
        // ตรวจสอบว่ามี audio หรือไม่
        const hasAudio = await this.hasAudio(inputPath);
        console.log(`[SCALE-VIDEO] Input has audio: ${hasAudio}`);
      
        return new Promise((resolve, reject) => {
          let command = ffmpeg(inputPath)
            .videoCodec('libx264')
            .size(`${width}x${height}`)
            .fps(30);
      
          // เพิ่ม audio codec ถ้ามี audio
          if (hasAudio) {
            command = command
              .audioCodec('aac')
              .audioBitrate('192k')
              .audioChannels(2)
              .audioFrequency(48000);
          } else {
            console.log('[SCALE-VIDEO] No audio in input - creating video only');
          }
      
          command
            .outputOptions([
              '-pix_fmt yuv420p',
              '-preset ultrafast',
              '-crf 23',
              `-t ${duration}`,
              '-shortest'
            ])
            .output(outputPath)
            .on('start', (cmd) => {
              console.log('[FFMPEG] Scale video command:', cmd);
            })
            .on('end', () => {
              console.log(`[FFMPEG] ✅ Video scaled${hasAudio ? ' with audio' : ''}`);
              resolve();
            })
            .on('error', (err) => {
              console.error('[FFMPEG] ❌ Error scaling video:', err);
              reject(err);
            })
            .run();
        });
      }

    private static async convertImageToJpg(inputPath: string, outputPath: string): Promise<void> {
        await sharp(inputPath)
            .jpeg({ quality: 95 })
            .toFile(outputPath);
    }

    private static getVideoDuration(videoPath: string): Promise<number> {
        return new Promise((resolve, reject) => {
            ffmpeg.ffprobe(videoPath, (err, metadata) => {
                if (err) {
                    console.error('[VIDEO-COMPOSER] Error getting video duration:', err);
                    reject(err);
                } else {
                    resolve(metadata.format.duration || 5);
                }
            });
        });
    }

    private static imageToVideo(
        imagePath: string,
        outputPath: string,
        duration: number,
        width: number,
        height: number
    ): Promise<void> {
        return new Promise((resolve, reject) => {
            ffmpeg(imagePath)
                .inputOptions([
                    '-loop 1',
                    `-t ${duration}`
                ])
                .videoCodec('libx264')
                .size(`${width}x${height}`)
                .fps(30)
                .outputOptions([
                    '-pix_fmt yuv420p',
                    '-preset ultrafast',
                    '-crf 23'
                ])
                .output(outputPath)
                .on('start', (cmd) => {
                    console.log('[FFMPEG] Image to video command:', cmd);
                })
                .on('end', () => {
                    console.log('[FFMPEG] ✅ Image converted to video');
                    resolve();
                })
                .on('error', (err) => {
                    console.error('[FFMPEG] ❌ Error converting image:', err);
                    reject(err);
                })
                .run();
        });
    }
    private static buildFilterComplex(
        config: VideoComposerConfig,
        inputCount: number
    ): string {
        const { width, height, type } = config;

        switch (type) {
            case 'split-horizontal':
                return this.buildSplitHorizontalFilter(width, height);
            case 'triple':
                return this.buildTripleHorizontalFilter(width, height);
            case 'quad':
                return this.buildQuadFilter(width, height);
            case 'fullscreen':
                return this.buildFullscreenFilter(width, height);
            default:
                throw new Error('Invalid template type');
        }
    }

    private static buildSplitHorizontalFilter(width: number, height: number): string {
        return `[0:v]setsar=1[top];[1:v]setsar=1[bottom];[top][bottom]vstack=inputs=2`;
    }

    private static buildTripleHorizontalFilter(width: number, height: number): string {
        return `[0:v]setsar=1[top];[1:v]setsar=1[middle];[2:v]setsar=1[bottom];[top][middle][bottom]vstack=inputs=3`;
    }

    private static buildQuadFilter(width: number, height: number): string {
        const halfWidth = Math.floor(width / 2);
        const halfHeight = Math.floor(height / 2);

        return `[0:v]scale=${halfWidth}:${halfHeight},setsar=1[tl];[1:v]scale=${halfWidth}:${halfHeight},setsar=1[tr];[2:v]scale=${halfWidth}:${halfHeight},setsar=1[bl];[3:v]scale=${halfWidth}:${halfHeight},setsar=1[br];[tl][tr]hstack=inputs=2[top];[bl][br]hstack=inputs=2[bottom];[top][bottom]vstack=inputs=2`;
    }

    private static buildFullscreenFilter(width: number, height: number): string {
        return `[0:v]scale=${width}:${height},setsar=1`;
    }

    // private static composeWithFFmpeg(
    //     inputFiles: string[],
    //     filterComplex: string,
    //     duration: number,
    //     outputPath: string,
    //     config: VideoComposerConfig
    // ): Promise<void> {
    //     return new Promise((resolve, reject) => {
    //         let command = ffmpeg();

    //         console.log('[FFMPEG] ========================================');
    //         console.log('[FFMPEG] Composing video...');

    //         // เพิ่ม inputs
    //         inputFiles.forEach((file, idx) => {
    //             console.log(`[FFMPEG] Input ${idx}: ${file}`);
    //             command = command.input(file);
    //         });

    //         command
    //             .complexFilter([filterComplex + '[v]']) // เพิ่ม [v] ลงใน filter string
    //             .map('[v]')  // ใช้ .map() แทน
    //             .videoCodec('libx264')
    //             .outputOptions([
    //                 '-preset medium',
    //                 '-crf 23',
    //                 '-pix_fmt yuv420p',
    //                 `-t ${duration}`,
    //                 '-movflags +faststart'
    //             ])
    //             .output(outputPath)
    //             .on('start', (cmd) => {
    //                 console.log('[FFMPEG] Command:', cmd);
    //             })
    //             .on('progress', (progress) => {
    //                 if (progress.percent) {
    //                     console.log(`[FFMPEG] Progress: ${progress.percent.toFixed(1)}%`);
    //                 }
    //             })
    //             .on('stderr', (stderrLine) => {
    //                 if (stderrLine.includes('frame=') ||
    //                     stderrLine.includes('time=') ||
    //                     stderrLine.includes('Error') ||
    //                     stderrLine.includes('error')) {
    //                     console.log('[FFMPEG]', stderrLine);
    //                 }
    //             })
    //             .on('end', () => {
    //                 console.log('[FFMPEG] ✅ Composition complete');
    //                 resolve();
    //             })
    //             .on('error', (err) => {
    //                 console.error('[FFMPEG] ❌ Error:', err.message);
    //                 reject(err);
    //             })
    //             .run();
    //     });
    // }

    private static composeWithFFmpeg(
        inputFiles: string[],
        filterComplex: string,
        duration: number,
        outputPath: string,
        config: VideoComposerConfig,
        audioInputIndex: number | null
      ): Promise<void> {
        return new Promise((resolve, reject) => {
          let command = ffmpeg();
      
          console.log('[FFMPEG] ========================================');
          console.log('[FFMPEG] Composing video...');
      
          inputFiles.forEach((file, idx) => {
            console.log(`[FFMPEG] Input ${idx}: ${file}`);
            command = command.input(file);
          });
      
          command.complexFilter([filterComplex + '[v]']);
      
          const outputOptions = [
            '-map [v]',
            '-c:v libx264',
            '-preset medium',
            '-crf 23',
            '-pix_fmt yuv420p',
            `-t ${duration}`,
            '-movflags +faststart'
          ];
      
          if (audioInputIndex !== null) {
            console.log(`[FFMPEG] Mapping audio from input ${audioInputIndex}`);
            
            // ปรับ audio settings ให้เข้ากันได้ดีกับ Android
            outputOptions.splice(1, 0,
              `-map ${audioInputIndex}:a`,
              '-c:a aac',                    // AAC codec (standard)
              '-b:a 192k',                   // เพิ่ม bitrate จาก 128k → 192k
              '-ar 48000',                   // Sample rate 48kHz (standard)
              '-ac 2',                       // Stereo (2 channels)
              '-profile:a aac_low',          // AAC-LC profile (widely supported)
              '-movflags +faststart'         // Enable fast start for streaming
            );
          } else {
            console.log('[FFMPEG] No audio source found - creating silent video');
          }
      
          console.log('[FFMPEG] Output options:', outputOptions);
      
          command
            .outputOptions(outputOptions)
            .output(outputPath)
            .on('start', (cmd) => {
              console.log('[FFMPEG] Command:', cmd);
            })
            .on('progress', (progress) => {
              if (progress.percent) {
                console.log(`[FFMPEG] Progress: ${progress.percent.toFixed(1)}%`);
              }
            })
            .on('stderr', (stderrLine) => {
              if (stderrLine.includes('frame=') ||
                  stderrLine.includes('time=') ||
                  stderrLine.includes('Error') ||
                  stderrLine.includes('error')) {
                console.log('[FFMPEG]', stderrLine);
              }
            })
            .on('end', () => {
              console.log('[FFMPEG] ✅ Composition complete');
              resolve();
            })
            .on('error', (err) => {
              console.error('[FFMPEG] ❌ Error:', err.message);
              reject(err);
            })
            .run();
        });
      }
    private static async cleanupTempFiles(files: string[]): Promise<void> {
        console.log('[VIDEO-COMPOSER] Cleaning up temp files...');
        for (const file of files) {
            try {
                await fs.unlink(file);
                console.log(`  Deleted: ${file}`);
            } catch (err) {
                console.error(`  Failed to delete: ${file}`, err);
            }
        }
    }

    private static hasAudio(videoPath: string): Promise<boolean> {
        return new Promise((resolve, reject) => {
            ffmpeg.ffprobe(videoPath, (err, metadata) => {
                if (err) {
                    reject(err);
                } else {
                    const hasAudioStream = metadata.streams.some(
                        stream => stream.codec_type === 'audio'
                    );
                    resolve(hasAudioStream);
                }
            });
        });
    }

    private static getAudioStreamIndex(videoPath: string): Promise<number | null> {
        return new Promise((resolve, reject) => {
            ffmpeg.ffprobe(videoPath, (err, metadata) => {
                if (err) {
                    reject(err);
                } else {
                    const audioStreamIndex = metadata.streams.findIndex(
                        stream => stream.codec_type === 'audio'
                    );
                    resolve(audioStreamIndex >= 0 ? audioStreamIndex : null);
                }
            });
        });
    }
}