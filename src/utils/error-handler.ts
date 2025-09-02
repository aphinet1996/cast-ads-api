export interface MongoError extends Error {
    code?: number;
    keyPattern?: Record<string, any>;
    keyValue?: Record<string, any>;
    errors?: Record<string, any>;
  }
  
  export interface ValidationErrorDetail {
    field: string;
    message: string;
    value?: any;
    code?: string;
  }
  
  /**
   * Safely converts unknown error to Error object
   */
  export function toError(error: unknown): Error {
    if (error instanceof Error) {
      return error;
    }
    
    if (typeof error === 'string') {
      return new Error(error);
    }
    
    if (typeof error === 'object' && error !== null) {
      const errorObj = error as any;
      const message = errorObj.message || errorObj.msg || 'Unknown error';
      const newError = new Error(message);
      
      // Preserve stack trace if available
      if (errorObj.stack) {
        newError.stack = errorObj.stack;
      }
      
      // Preserve name if available
      if (errorObj.name) {
        newError.name = errorObj.name;
      }
      
      return newError;
    }
    
    return new Error(`Unknown error: ${String(error)}`);
  }
  
  /**
   * Checks if error is a MongoDB error
   */
  export function isMongoError(error: unknown): error is MongoError {
    const errorObj = error as any;
    return errorObj && (
      typeof errorObj.code === 'number' ||
      errorObj.name === 'ValidationError' ||
      errorObj.name === 'MongoError' ||
      errorObj.name === 'MongoServerError'
    );
  }
  
  /**
   * Checks if error is a MongoDB validation error
   */
  export function isValidationError(error: unknown): error is MongoError {
    const errorObj = error as any;
    return errorObj && errorObj.name === 'ValidationError' && errorObj.errors;
  }
  
  /**
   * Checks if error is a MongoDB duplicate key error
   */
  export function isDuplicateKeyError(error: unknown): error is MongoError {
    const errorObj = error as any;
    return errorObj && errorObj.code === 11000;
  }
  
  /**
   * Extracts validation error details from MongoDB ValidationError
   */
  export function extractValidationErrors(error: unknown): ValidationErrorDetail[] {
    if (!isValidationError(error)) {
      return [];
    }
    
    const details: ValidationErrorDetail[] = [];
    const errors = error.errors || {};
    
    for (const [field, detail] of Object.entries(errors)) {
      const errorDetail = detail as any;
      details.push({
        field,
        message: errorDetail.message || 'Validation failed',
        value: errorDetail.value,
        code: errorDetail.kind || errorDetail.code
      });
    }
    
    return details;
  }
  
  /**
   * Creates a user-friendly error message from any error
   */
  export function getUserFriendlyMessage(error: unknown): string {
    const errorObj = toError(error);
    
    if (isValidationError(error)) {
      const details = extractValidationErrors(error);
      if (details.length > 0) {
        return `Validation failed: ${details[0].message}`;
      }
      return 'Data validation failed';
    }
    
    if (isDuplicateKeyError(error)) {
      return 'This record already exists';
    }
    
    if (isMongoError(error)) {
      return 'Database operation failed';
    }
    
    // Return generic message for unknown errors
    return 'An unexpected error occurred';
  }
  
  /**
   * Logs error with proper formatting and context
   */
  export function logError(
    module: string,
    action: string,
    error: unknown,
    context?: Record<string, any>
  ): void {
    const errorObj = toError(error);
    const requestId = context?.requestId || 'unknown';
    
    console.error(`[${module}-${requestId}] ❌ ${action} failed:`);
    console.error(`[${module}-${requestId}] Error name: ${errorObj.name}`);
    console.error(`[${module}-${requestId}] Error message: ${errorObj.message}`);
    
    if (context) {
      console.error(`[${module}-${requestId}] Context:`, context);
    }
    
    // MongoDB specific error details
    if (isMongoError(error)) {
      const mongoError = error as MongoError;
      
      if (mongoError.code) {
        console.error(`[${module}-${requestId}] MongoDB Code: ${mongoError.code}`);
      }
      
      if (isValidationError(error)) {
        const validationDetails = extractValidationErrors(error);
        console.error(`[${module}-${requestId}] Validation Errors:`, validationDetails);
      }
      
      if (isDuplicateKeyError(error)) {
        console.error(`[${module}-${requestId}] Duplicate Key Pattern:`, mongoError.keyPattern);
        console.error(`[${module}-${requestId}] Duplicate Key Value:`, mongoError.keyValue);
      }
    }
    
    // Show stack trace in development
    if (process.env.NODE_ENV === 'development') {
      console.error(`[${module}-${requestId}] Stack trace:`, errorObj.stack);
    }
  }
  
  /**
   * Express error response helper
   */
  export function createErrorResponse(error: unknown) {
    const errorObj = toError(error);
    
    if (isValidationError(error)) {
      return {
        status: 400,
        response: {
          success: false,
          error: 'Validation error',
          message: getUserFriendlyMessage(error),
          details: extractValidationErrors(error)
        }
      };
    }
    
    if (isDuplicateKeyError(error)) {
      return {
        status: 409,
        response: {
          success: false,
          error: 'Duplicate entry',
          message: getUserFriendlyMessage(error)
        }
      };
    }
    
    return {
      status: 500,
      response: {
        success: false,
        error: 'Internal server error',
        message: getUserFriendlyMessage(error),
        ...(process.env.NODE_ENV === 'development' && { 
          details: errorObj.message 
        })
      }
    };
  }
  
  /**
   * Async error wrapper for route handlers
   */
  export function asyncHandler<T extends any[]>(
    fn: (...args: T) => Promise<any>
  ) {
    return (...args: T) => {
      const [req, res, next] = args as any;
      
      Promise.resolve(fn(...args)).catch((error: unknown) => {
        const errorResponse = createErrorResponse(error);
        res.status(errorResponse.status).json(errorResponse.response);
      });
    };
  }
  