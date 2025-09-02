import { Request } from 'express';

export enum LogLevel {
    ERROR = 0,
    WARN = 1,
    INFO = 2,
    DEBUG = 3
}

interface LogContext {
    requestId?: string;
    userId?: string;
    deviceId?: string;
    ip?: string;
    userAgent?: string;
    validationErrors?: any[];
    [key: string]: any; // Allow additional properties
}

class Logger {
    private static instance: Logger;
    private logLevel: LogLevel = LogLevel.INFO;
    private isDevelopment: boolean = process.env.NODE_ENV === 'development';

    private constructor() {
        // Set log level from environment variable
        const envLogLevel = process.env.LOG_LEVEL?.toLowerCase();
        switch (envLogLevel) {
            case 'error':
                this.logLevel = LogLevel.ERROR;
                break;
            case 'warn':
                this.logLevel = LogLevel.WARN;
                break;
            case 'info':
                this.logLevel = LogLevel.INFO;
                break;
            case 'debug':
                this.logLevel = LogLevel.DEBUG;
                break;
            default:
                this.logLevel = this.isDevelopment ? LogLevel.DEBUG : LogLevel.INFO;
        }
    }

    public static getInstance(): Logger {
        if (!Logger.instance) {
            Logger.instance = new Logger();
        }
        return Logger.instance;
    }

    private formatMessage(level: string, module: string, message: string, context?: LogContext): string {
        const timestamp = new Date().toISOString();
        const contextStr = context ? JSON.stringify(context) : '';
        return `[${timestamp}] ${level} [${module}] ${message} ${contextStr}`.trim();
    }

    private shouldLog(level: LogLevel): boolean {
        return level <= this.logLevel;
    }

    // Public logging methods
    public error(module: string, message: string, error?: Error, context?: LogContext): void {
        if (!this.shouldLog(LogLevel.ERROR)) return;

        console.error(this.formatMessage('ERROR', module, message, context));
        if (error) {
            console.error(`[${module}] Error details:`, {
                name: error.name,
                message: error.message,
                stack: this.isDevelopment ? error.stack : undefined
            });
        }
    }

    public warn(module: string, message: string, context?: LogContext): void {
        if (!this.shouldLog(LogLevel.WARN)) return;
        console.warn(this.formatMessage('WARN', module, message, context));
    }

    public info(module: string, message: string, context?: LogContext): void {
        if (!this.shouldLog(LogLevel.INFO)) return;
        console.log(this.formatMessage('INFO', module, message, context));
    }

    public debug(module: string, message: string, data?: any, context?: LogContext): void {
        if (!this.shouldLog(LogLevel.DEBUG)) return;
        console.log(this.formatMessage('DEBUG', module, message, context));
        if (data && this.isDevelopment) {
            console.log(`[${module}] Debug data:`, data);
        }
    }

    // Helper methods for common scenarios
    public logRequest(req: Request, module: string, action: string): string {
        const requestId = this.generateRequestId();
        const context: LogContext = {
            requestId,
            ip: req.ip,
            userAgent: req.headers['user-agent']
        };

        this.info(module, `${action} - Request started`, context);
        this.debug(module, `Request details`, {
            method: req.method,
            path: req.path,
            query: req.query,
            body: req.body,
            headers: {
                'content-type': req.headers['content-type'],
                'content-length': req.headers['content-length']
            }
        }, context);

        return requestId;
    }

    public logSuccess(module: string, action: string, result?: any, context?: LogContext): void {
        this.info(module, `${action} - Completed successfully`, context);
        if (result && this.isDevelopment) {
            this.debug(module, `Success result`, result, context);
        }
    }

    public logError(module: string, action: string, error: Error, context?: LogContext): void {
        this.error(module, `${action} - Failed`, error, context);
    }

    public logDatabaseOperation(module: string, operation: string, collection: string, query?: any, result?: any, context?: LogContext): void {
        this.debug(module, `DB ${operation} on ${collection}`, { query, result }, context);
    }

    public logValidation(module: string, isValid: boolean, errors?: any[], context?: LogContext): void {
        if (isValid) {
            this.debug(module, 'Validation passed', {}, context);
        } else {
            this.warn(module, 'Validation failed', { ...context, validationErrors: errors });
        }
    }

    private generateRequestId(): string {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    // Method to create module-specific logger
    public createModuleLogger(moduleName: string) {
        return {
            error: (message: string, error?: Error, context?: LogContext) => this.error(moduleName, message, error, context),
            warn: (message: string, context?: LogContext) => this.warn(moduleName, message, context),
            info: (message: string, context?: LogContext) => this.info(moduleName, message, context),
            debug: (message: string, data?: any, context?: LogContext) => this.debug(moduleName, message, data, context),
            logRequest: (req: Request, action: string) => this.logRequest(req, moduleName, action),
            logSuccess: (action: string, result?: any, context?: LogContext) => this.logSuccess(moduleName, action, result, context),
            logError: (action: string, error: Error, context?: LogContext) => this.logError(moduleName, action, error, context),
            logDatabaseOperation: (operation: string, collection: string, query?: any, result?: any, context?: LogContext) => 
                this.logDatabaseOperation(moduleName, operation, collection, query, result, context),
            logValidation: (isValid: boolean, errors?: any[], context?: LogContext) => this.logValidation(moduleName, isValid, errors, context)
        };
    }
}

// Export singleton instance
export const logger = Logger.getInstance();