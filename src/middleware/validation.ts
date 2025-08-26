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
        return res.status(400).json({ error: error.details[0].message });
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
        return res.status(400).json({ error: error.details[0].message });
    }
    next();
};

export const validateDeviceRegistration = (req: Request, res: Response, next: NextFunction) => {
    const schema = Joi.object({
      deviceId: Joi.string().optional(), // optional สำหรับ auto-generate
      name: Joi.string().required().min(3).max(100),
      ip: Joi.string().ip().required(),
      port: Joi.number().integer().min(1024).max(65535).default(3001),
      capabilities: Joi.array().items(Joi.string()).default(['video', 'audio']),
      status: Joi.string().valid('online', 'offline', 'busy').optional()
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