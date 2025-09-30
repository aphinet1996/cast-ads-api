import Joi from 'joi';
import { Request, Response, NextFunction } from 'express';

export const validateCastRequest = (req: Request, res: Response, next: NextFunction) => {
    const schema = Joi.object({
        deviceId: Joi.string().required(),
        mediaId: Joi.string().required(),
        options: Joi.object({
            autoplay: Joi.boolean(),
            loop: Joi.boolean(),
            volume: Joi.number().min(0).max(100),
            startTime: Joi.number().min(0)
        }).optional()
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

export const validatePlaybackControl = (req: Request, res: Response, next: NextFunction) => {
    const schema = Joi.object({
        action: Joi.string().valid('play', 'pause', 'stop', 'seek', 'volume').required(),
        value: Joi.number().when('action', {
            is: Joi.string().valid('seek', 'volume'),
            then: Joi.required(),
            otherwise: Joi.optional()
        })
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

// Template validation schemas
export const validateTemplateRequest = (req: Request, res: Response, next: NextFunction) => {
    const imageSchema = Joi.object({
        mediaId: Joi.string().required(),
        name: Joi.string().required(),
        type: Joi.string().valid('image', 'video', 'audio', 'document', 'presentation').required(),
        url: Joi.string().uri().required(),
        size: Joi.number().min(0).optional(),
        mimeType: Joi.string().optional(),
        duration: Joi.number().min(0).optional(),
        thumbnail: Joi.string().uri().optional(),

        originalName: Joi.string().optional(),
        path: Joi.string().optional(),
        uploadedAt: Joi.date().optional(),
        metadata: Joi.object().optional()
    }).unknown(true);

    const schema = Joi.object({
        name: Joi.string().trim().min(1).max(255).required().messages({
            'string.empty': 'Template name is required',
            'string.max': 'Template name cannot exceed 255 characters'
        }),
        type: Joi.string().valid('split-horizontal', 'quad', 'fullscreen').required().messages({
            'any.only': 'Template type must be one of: split-horizontal, quad, fullscreen'
        }),
        images: Joi.object().pattern(
            Joi.string().pattern(/^[0-9]+$/), // keys must be numeric strings
            imageSchema
        ).required().messages({
            'object.base': 'Images must be an object with numeric keys'
        }),
        width: Joi.number().integer().min(1).max(10000).required().messages({
            'number.min': 'Width must be at least 1',
            'number.max': 'Width cannot exceed 10000'
        }),
        height: Joi.number().integer().min(1).max(10000).required().messages({
            'number.min': 'Height must be at least 1',
            'number.max': 'Height cannot exceed 10000'
        }),
        createdAt: Joi.date().optional()
    });

    const { error } = schema.validate(req.body, { abortEarly: false });
    if (error) {
        const errors = error.details.map(detail => detail.message);
        return res.status(400).json({ 
            success: false,
            error: 'Validation failed',
            details: errors
        });
    }
    next();
};

export const validateTemplateCastRequest = (req: Request, res: Response, next: NextFunction) => {
    const schema = Joi.object({
        templateId: Joi.string().required().messages({
            'string.empty': 'Template ID is required'
        }),
        deviceId: Joi.string().required().messages({
            'string.empty': 'Device ID is required'
        }),
        options: Joi.object({
            autoplay: Joi.boolean().default(true),
            loop: Joi.boolean().default(false),
            volume: Joi.number().min(0).max(100).default(50),
            startTime: Joi.number().min(0).default(0),
            duration: Joi.number().min(0).optional(),
            transition: Joi.object({
                type: Joi.string().valid('fade', 'slide', 'none').default('fade'),
                duration: Joi.number().min(0).max(5000).default(1000) // milliseconds
            }).optional()
        }).optional().default({})
    });

    const { error, value } = schema.validate(req.body);
    if (error) {
        return res.status(400).json({ 
            success: false,
            error: error.details[0].message 
        });
    }
    
    // Replace req.body with validated and default values
    req.body = value;
    next();
};

export const validateTemplateUpdate = (req: Request, res: Response, next: NextFunction) => {
    const imageSchema = Joi.object({
        mediaId: Joi.string().required(),
        name: Joi.string().required(),
        type: Joi.string().valid('image', 'video', 'audio', 'document', 'presentation').required(),
        url: Joi.string().uri().required(),
        size: Joi.number().min(0).optional(),
        mimeType: Joi.string().optional(),
        duration: Joi.number().min(0).optional(),
        thumbnail: Joi.string().uri().optional()
    });

    const schema = Joi.object({
        name: Joi.string().trim().min(1).max(255).optional(),
        type: Joi.string().valid('split-horizontal', 'quad', 'fullscreen').optional(),
        images: Joi.object().pattern(
            Joi.string().pattern(/^[0-9]+$/),
            imageSchema
        ).optional(),
        width: Joi.number().integer().min(1).max(10000).optional(),
        height: Joi.number().integer().min(1).max(10000).optional()
    }).min(1).messages({
        'object.min': 'At least one field must be provided for update'
    });

    const { error } = schema.validate(req.body);
    if (error) {
        const errors = error.details.map(detail => detail.message);
        return res.status(400).json({ 
            success: false,
            error: 'Validation failed',
            details: errors
        });
    }
    next();
};

export const validateDuplicateTemplate = (req: Request, res: Response, next: NextFunction) => {
    const schema = Joi.object({
        name: Joi.string().trim().min(1).max(255).optional()
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

// Query parameter validation
export const validateTemplateQuery = (req: Request, res: Response, next: NextFunction) => {
    const schema = Joi.object({
        type: Joi.string().valid('split-horizontal', 'quad', 'fullscreen').optional(),
        search: Joi.string().trim().min(1).max(100).optional(),
        limit: Joi.number().integer().min(1).max(100).default(50).optional(),
        offset: Joi.number().integer().min(0).default(0).optional(),
        sortBy: Joi.string().valid('name', 'createdAt', 'updatedAt', 'type').default('createdAt').optional(),
        sortOrder: Joi.string().valid('asc', 'desc').default('desc').optional()
    });

    const { error, value } = schema.validate(req.query);
    if (error) {
        return res.status(400).json({ 
            success: false,
            error: error.details[0].message 
        });
    }
    
    req.query = value;
    next();
};

export const validateDeviceRegistration = (req: Request, res: Response, next: NextFunction) => {
    const requestId = Date.now().toString(36) + Math.random().toString(36).substr(2);
    
    console.log(`[VALIDATION-${requestId}] === Device Registration Validation ===`);
    console.log(`[VALIDATION-${requestId}] Request method: ${req.method}`);
    console.log(`[VALIDATION-${requestId}] Request path: ${req.path}`);
    console.log(`[VALIDATION-${requestId}] Request headers:`, {
        'content-type': req.headers['content-type'],
        'user-agent': req.headers['user-agent'],
        'content-length': req.headers['content-length']
    });
    console.log(`[VALIDATION-${requestId}] Raw request body:`, JSON.stringify(req.body, null, 2));
    
    // Check if body exists
    if (!req.body || Object.keys(req.body).length === 0) {
        console.error(`[VALIDATION-${requestId}] ❌ Empty request body`);
        return res.status(400).json({ 
            success: false, 
            error: 'Request body is required' 
        });
    }
    
    const schema = Joi.object({
        // Device identification
        serialNumber: Joi.string().trim().allow('').optional(), // เปิดให้ส่งมาว่างได้
        deviceId: Joi.string().trim().allow('').optional(), // optional สำหรับ auto-generate
        uniqueId: Joi.string().trim().allow('').optional(), // unique identifier
        instanceId: Joi.string().trim().allow('').optional(), // instance identifier
        
        // Device information
        deviceOS: Joi.string().trim().allow('').optional(), // operating system
        deviceName: Joi.string().trim().allow('').optional(), // device model/brand name
        // name: Joi.string().required().min(3).max(100).trim(), // display name (required)
        modelName: Joi.string().trim().allow('').optional(), // model name
        
        // Network information
        ipAddress: Joi.string().ip().required(), // IP address (required)
        port: Joi.number().integer().min(1024).max(65535).default(3001),
        macAddress: Joi.string().trim().allow('').optional(), // MAC address
        
        // Screen information
        screenResolution: Joi.object({
            width: Joi.number().integer().min(1).required(),
            height: Joi.number().integer().min(1).required()
        }).optional(),
        
        // Capabilities and status
        capabilities: Joi.array()
            .items(Joi.string().valid('video', 'audio', 'image', 'document', 'presentation'))
            .default(['video', 'audio']),
        status: Joi.string().valid('online', 'offline', 'busy').optional()
    });

    console.log(`[VALIDATION-${requestId}] Validating against schema...`);
    console.log(`[VALIDATION-${requestId}] Schema rules:`, {
        serialNumber: 'string (optional, can be empty)',
        deviceId: 'string (optional, auto-generate if empty)',
        uniqueId: 'string (optional)',
        instanceId: 'string (optional)',
        deviceOS: 'string (optional)',
        deviceName: 'string (optional)', 
        // name: 'string (required, 3-100 chars)',
        modelName: 'string (optional)',
        ipAddress: 'valid IP address (required)',
        port: 'integer (1024-65535, default: 3001)',
        macAddress: 'string (optional)',
        screenResolution: 'object with width/height (optional)',
        capabilities: 'array of strings (default: [video, audio])',
        status: 'online|offline|busy (optional)'
    });

    const { error, value } = schema.validate(req.body, { 
        abortEarly: false,
        allowUnknown: false,
        stripUnknown: true
    });

    if (error) {
        console.error(`[VALIDATION-${requestId}] ❌ Device registration validation failed`);
        console.error(`[VALIDATION-${requestId}] Total validation errors: ${error.details.length}`);
        
        error.details.forEach((detail, index) => {
            console.error(`[VALIDATION-${requestId}] Error ${index + 1}:`, {
                field: detail.path.join('.') || 'root',
                message: detail.message,
                value: detail.context?.value,
                type: detail.type
            });
        });
        
        // แสดง specific error details
        const validationErrors = error.details.map(detail => {
            const field = detail.path.join('.') || 'unknown';
            let suggestion = '';
            
            switch (detail.type) {
                case 'any.required':
                    suggestion = `Field '${field}' is required`;
                    break;
                case 'string.min':
                    suggestion = `Field '${field}' must be at least ${detail.context?.limit} characters`;
                    break;
                case 'string.max':
                    suggestion = `Field '${field}' must not exceed ${detail.context?.limit} characters`;
                    break;
                case 'string.ip':
                    suggestion = `Field '${field}' must be a valid IP address (e.g., 192.168.1.100)`;
                    break;
                case 'number.min':
                    suggestion = `Field '${field}' must be at least ${detail.context?.limit}`;
                    break;
                case 'number.max':
                    suggestion = `Field '${field}' must not exceed ${detail.context?.limit}`;
                    break;
                case 'any.only':
                    suggestion = `Field '${field}' must be one of: ${detail.context?.valids?.join(', ')}`;
                    break;
                case 'object.base':
                    suggestion = `Field '${field}' must be an object`;
                    break;
                case 'array.base':
                    suggestion = `Field '${field}' must be an array`;
                    break;
                default:
                    suggestion = detail.message;
            }
            
            return {
                field,
                message: detail.message,
                suggestion,
                receivedValue: detail.context?.value
            };
        });
        
        console.error(`[VALIDATION-${requestId}] Detailed validation errors:`, validationErrors);
        
        return res.status(400).json({ 
            success: false, 
            error: `Validation failed: ${error.details[0].message}`,
            validationErrors
        });
    }

    console.log(`[VALIDATION-${requestId}] ✅ Device registration validation passed`);
    console.log(`[VALIDATION-${requestId}] Validated and sanitized data:`, JSON.stringify(value, null, 2));
    
    // Show what defaults were applied
    const appliedDefaults = [];
    if (!req.body.port && value.port === 3001) {
        appliedDefaults.push('port: 3001 (default)');
    }
    if (!req.body.capabilities && value.capabilities) {
        appliedDefaults.push(`capabilities: ${JSON.stringify(value.capabilities)} (default)`);
    }
    if (appliedDefaults.length > 0) {
        console.log(`[VALIDATION-${requestId}] Applied defaults: ${appliedDefaults.join(', ')}`);
    }
    
    // Replace req.body with validated and sanitized data
    req.body = value;
    console.log(`[VALIDATION-${requestId}] === Validation completed successfully ===`);
    
    next();
};
