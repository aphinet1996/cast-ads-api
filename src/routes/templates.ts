import { Router } from 'express';
import { TemplateService } from '../services/template.service';
import { validateTemplateRequest, validateTemplateCastRequest } from '../middleware/validation';
import { SocketManager } from '../services/socket.service';
import { DeviceService } from '../services/device.service';

const router = Router();

// GET /api/templates - Get all templates
router.get('/', async (req, res) => {
    try {
        const { type, search } = req.query;

        let templates;
        if (search) {
            templates = await TemplateService.searchTemplates(search as string);
        } else if (type) {
            templates = await TemplateService.getTemplatesByType(
                type as 'split-horizontal' | 'quad' | 'fullscreen'
            );
        } else {
            templates = await TemplateService.getAllTemplates();
        }

        res.json({ 
            success: true, 
            data: templates 
        });
    } catch (error: any) {
        console.error('Error fetching templates:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to fetch templates' 
        });
    }
});

// POST /api/templates - Save new template
router.post('/', validateTemplateRequest, async (req, res) => {
    try {
        const { name, type, images, width, height } = req.body;

        // Validate template structure
        const validation = TemplateService.validateTemplateStructure(type, images);
        if (!validation.valid) {
            return res.status(400).json({
                success: false,
                error: validation.error
            });
        }

        const template = await TemplateService.saveTemplate({
            name,
            type,
            images,
            width,
            height
        });

        res.status(201).json({ 
            success: true, 
            data: template 
        });
    } catch (error: any) {
        console.error('Error saving template:', error);
        
        if (error.name === 'ValidationError') {
            return res.status(400).json({
                success: false,
                error: error.message
            });
        }
        
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                error: 'Template with this name already exists'
            });
        }

        res.status(500).json({ 
            success: false, 
            error: 'Failed to save template' 
        });
    }
});

// GET /api/templates/stats - Get template statistics
router.get('/stats', async (req, res) => {
    try {
        const stats = await TemplateService.getTemplateStats();
        res.json({ 
            success: true, 
            data: stats 
        });
    } catch (error: any) {
        console.error('Error fetching template stats:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to fetch template statistics' 
        });
    }
});

// GET /api/templates/:id - Get template by ID
router.get('/:id', async (req, res) => {
    try {
        const template = await TemplateService.getTemplateById(req.params.id);
        
        if (!template) {
            return res.status(404).json({ 
                success: false, 
                error: 'Template not found' 
            });
        }

        res.json({ 
            success: true, 
            data: template 
        });
    } catch (error: any) {
        console.error('Error fetching template:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to fetch template' 
        });
    }
});

// PUT /api/templates/:id - Update template
router.put('/:id', validateTemplateRequest, async (req, res) => {
    try {
        const { name, type, images, width, height } = req.body;

        // Validate template structure
        if (type && images) {
            const validation = TemplateService.validateTemplateStructure(type, images);
            if (!validation.valid) {
                return res.status(400).json({
                    success: false,
                    error: validation.error
                });
            }
        }

        const template = await TemplateService.updateTemplate(req.params.id, {
            name,
            type,
            images,
            width,
            height
        });

        if (!template) {
            return res.status(404).json({ 
                success: false, 
                error: 'Template not found' 
            });
        }

        res.json({ 
            success: true, 
            data: template 
        });
    } catch (error: any) {
        console.error('Error updating template:', error);
        
        if (error.name === 'ValidationError') {
            return res.status(400).json({
                success: false,
                error: error.message
            });
        }

        res.status(500).json({ 
            success: false, 
            error: 'Failed to update template' 
        });
    }
});

// DELETE /api/templates/:id - Delete template
router.delete('/:id', async (req, res) => {
    try {
        await TemplateService.deleteTemplate(req.params.id);
        res.json({ 
            success: true, 
            message: 'Template deleted successfully' 
        });
    } catch (error: any) {
        console.error('Error deleting template:', error);
        
        if (error.message === 'Template not found') {
            return res.status(404).json({ 
                success: false, 
                error: 'Template not found' 
            });
        }

        res.status(500).json({ 
            success: false, 
            error: 'Failed to delete template' 
        });
    }
});

// POST /api/templates/cast - Cast template to device
router.post('/cast', validateTemplateCastRequest, async (req, res) => {
    try {
        const { templateId, deviceId, options } = req.body;

        // Verify template exists
        const template = await TemplateService.getTemplateById(templateId);
        if (!template) {
            return res.status(404).json({ 
                success: false, 
                error: 'Template not found' 
            });
        }

        // Verify device exists and is online
        const device = await DeviceService.getDeviceById(deviceId);
        if (!device) {
            return res.status(404).json({ 
                success: false, 
                error: 'Device not found' 
            });
        }
        if (device.status !== 'online') {
            return res.status(400).json({ 
                success: false, 
                error: 'Device is not online' 
            });
        }

        // Send cast command via socket
        const socketManager = SocketManager.getInstance();
        const success = socketManager.castTemplateToDevice(deviceId, template, options);

        if (success) {
            // Update device status
            await DeviceService.updateDeviceStatus(deviceId, 'busy');
            
            res.json({ 
                success: true, 
                message: 'Template cast successfully',
                data: {
                    templateId,
                    deviceId,
                    templateName: template.name
                }
            });
        } else {
            res.status(400).json({ 
                success: false, 
                error: 'Failed to cast template' 
            });
        }
    } catch (error: any) {
        console.error('Error casting template:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to cast template' 
        });
    }
});

// POST /api/templates/:id/duplicate - Duplicate template
router.post('/:id/duplicate', async (req, res) => {
    try {
        const { name } = req.body;
        
        const originalTemplate = await TemplateService.getTemplateById(req.params.id);
        if (!originalTemplate) {
            return res.status(404).json({ 
                success: false, 
                error: 'Template not found' 
            });
        }

        const duplicatedTemplate = await TemplateService.saveTemplate({
            name: name || `${originalTemplate.name} (Copy)`,
            type: originalTemplate.type,
            images: originalTemplate.images,
            width: originalTemplate.width,
            height: originalTemplate.height
        });

        res.status(201).json({ 
            success: true, 
            data: duplicatedTemplate 
        });
    } catch (error: any) {
        console.error('Error duplicating template:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to duplicate template' 
        });
    }
});

export const templateRoutes = router;