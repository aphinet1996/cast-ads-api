import { TemplateModel, Template } from '../models/template';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs/promises';
import path from 'path';

export class TemplateService {
    /**
     * Save a new template
     */
    static async saveTemplate(templateData: {
        name: string;
        type: 'split-horizontal' | 'quad' | 'fullscreen';
        images: { [key: number]: any };
        width: number;
        height: number;
    }): Promise<Template> {
        const templateId = uuidv4();

        try {
            // Generate thumbnail if possible
            const thumbnail = await this.generateTemplateThumbnail(
                templateData.type, 
                templateData.images, 
                templateData.width, 
                templateData.height
            );

            const template = new TemplateModel({
                templateId,
                name: templateData.name.trim(),
                type: templateData.type,
                images: templateData.images,
                width: templateData.width,
                height: templateData.height,
                thumbnail
            });

            const saved = await template.save();
            console.log('Template saved successfully:', saved.templateId);

            return this.transformTemplate(saved);
        } catch (error) {
            console.error('Error saving template:', error);
            throw error;
        }
    }

    /**
     * Get all templates
     */
    static async getAllTemplates(): Promise<Template[]> {
        try {
            const templates = await TemplateModel.find({})
                .sort({ createdAt: -1 })
                .lean();
            
            return templates.map(template => this.transformTemplate(template));
        } catch (error) {
            console.error('Error fetching templates:', error);
            throw error;
        }
    }

    /**
     * Get template by ID
     */
    static async getTemplateById(templateId: string): Promise<Template | null> {
        try {
            const template = await TemplateModel.findOne({ templateId }).lean();
            return template ? this.transformTemplate(template) : null;
        } catch (error) {
            console.error('Error fetching template:', error);
            throw error;
        }
    }

    /**
     * Update template
     */
    static async updateTemplate(
        templateId: string, 
        updateData: Partial<{
            name: string;
            type: 'split-horizontal' | 'quad' | 'fullscreen';
            images: { [key: number]: any };
            width: number;
            height: number;
        }>
    ): Promise<Template | null> {
        try {
            // Generate new thumbnail if layout changed
            let thumbnail;
            if (updateData.type || updateData.images || updateData.width || updateData.height) {
                const existing = await this.getTemplateById(templateId);
                if (existing) {
                    thumbnail = await this.generateTemplateThumbnail(
                        updateData.type || existing.type,
                        updateData.images || existing.images,
                        updateData.width || existing.width,
                        updateData.height || existing.height
                    );
                }
            }

            const updated = await TemplateModel.findOneAndUpdate(
                { templateId },
                {
                    ...updateData,
                    ...(thumbnail && { thumbnail })
                },
                { new: true }
            );

            return updated ? this.transformTemplate(updated) : null;
        } catch (error) {
            console.error('Error updating template:', error);
            throw error;
        }
    }

    /**
     * Delete template
     */
    static async deleteTemplate(templateId: string): Promise<void> {
        try {
            const template = await TemplateModel.findOne({ templateId });
            if (!template) {
                throw new Error('Template not found');
            }

            // Delete thumbnail file if exists
            if (template.thumbnail) {
                try {
                    await fs.unlink(template.thumbnail);
                } catch (error) {
                    console.error('Error deleting thumbnail:', error);
                }
            }

            await TemplateModel.deleteOne({ templateId });
            console.log('Template deleted successfully:', templateId);
        } catch (error) {
            console.error('Error deleting template:', error);
            throw error;
        }
    }

    /**
     * Get templates by type
     */
    static async getTemplatesByType(type: 'split-horizontal' | 'quad' | 'fullscreen'): Promise<Template[]> {
        try {
            const templates = await TemplateModel.find({ type })
                .sort({ createdAt: -1 })
                .lean();
            
            return templates.map(template => this.transformTemplate(template));
        } catch (error) {
            console.error('Error fetching templates by type:', error);
            throw error;
        }
    }

    /**
     * Search templates by name
     */
    static async searchTemplates(query: string): Promise<Template[]> {
        try {
            const templates = await TemplateModel.find({
                name: { $regex: query, $options: 'i' }
            })
            .sort({ createdAt: -1 })
            .lean();
            
            return templates.map(template => this.transformTemplate(template));
        } catch (error) {
            console.error('Error searching templates:', error);
            throw error;
        }
    }

    /**
     * Get template statistics
     */
    static async getTemplateStats(): Promise<{
        total: number;
        byType: { [key: string]: number };
        recentCount: number;
    }> {
        try {
            const total = await TemplateModel.countDocuments({});
            
            const typeStats = await TemplateModel.aggregate([
                {
                    $group: {
                        _id: '$type',
                        count: { $sum: 1 }
                    }
                }
            ]);

            const byType: { [key: string]: number } = {};
            typeStats.forEach(stat => {
                byType[stat._id] = stat.count;
            });

            // Count templates created in last 7 days
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            const recentCount = await TemplateModel.countDocuments({
                createdAt: { $gte: weekAgo }
            });

            return {
                total,
                byType,
                recentCount
            };
        } catch (error) {
            console.error('Error getting template stats:', error);
            throw error;
        }
    }

    /**
     * Transform template document to Template interface
     */
    private static transformTemplate(template: any): Template {
        return {
            id: template.templateId,
            name: template.name,
            type: template.type,
            images: template.images,
            width: template.width,
            height: template.height,
            thumbnail: template.thumbnail,
            createdAt: template.createdAt,
            updatedAt: template.updatedAt
        };
    }

    /**
     * Generate template thumbnail (placeholder implementation)
     */
    private static async generateTemplateThumbnail(
        type: string,
        images: { [key: number]: any },
        width: number,
        height: number
    ): Promise<string | undefined> {
        try {
            // Simple implementation - return the first image URL as thumbnail if available
            const firstImage = Object.values(images)[0];
            if (firstImage && firstImage.url) {
                return firstImage.url;
            }

            // For more advanced thumbnail generation, you could use:
            // - Sharp library to create composite images
            // - Canvas to draw template layout
            // - FFmpeg for video thumbnails

            return undefined;
        } catch (error) {
            console.error('Error generating thumbnail:', error);
            return undefined;
        }
    }

    /**
     * Validate template structure
     */
    static validateTemplateStructure(
        type: string,
        images: { [key: number]: any }
    ): { valid: boolean; error?: string } {
        const requiredSlots = {
            'split-horizontal': 2,
            'quad': 4,
            'fullscreen': 1
        };

        const maxSlots = requiredSlots[type as keyof typeof requiredSlots];
        if (!maxSlots) {
            return { valid: false, error: 'Invalid template type' };
        }

        const imageSlots = Object.keys(images).map(key => parseInt(key));
        const invalidSlots = imageSlots.filter(slot => slot < 0 || slot >= maxSlots);
        
        if (invalidSlots.length > 0) {
            return { 
                valid: false, 
                error: `Invalid slot numbers: ${invalidSlots.join(', ')}. Valid slots for ${type}: 0-${maxSlots - 1}` 
            };
        }

        return { valid: true };
    }
}