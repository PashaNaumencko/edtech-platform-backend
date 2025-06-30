#!/usr/bin/env node

const { GraphQLError, GraphQLFormattedError } = require('graphql');

/**
 * Custom GraphQL Error Types - Day 3 Implementation
 * Provides structured error handling for client applications
 */

// Base custom error class
class BaseGraphQLError extends GraphQLError {
  constructor(message, code, statusCode = 400, extensions = {}) {
    super(message, {
      extensions: {
        code,
        statusCode,
        timestamp: new Date().toISOString(),
        ...extensions
      }
    });
    
    this.name = this.constructor.name;
    this.statusCode = statusCode;
  }
}

// Authentication and Authorization Errors
class AuthenticationError extends BaseGraphQLError {
  constructor(message = 'Authentication required', extensions = {}) {
    super(message, 'UNAUTHENTICATED', 401, {
      type: 'authentication',
      ...extensions
    });
  }
}

class AuthorizationError extends BaseGraphQLError {
  constructor(message = 'Insufficient permissions', extensions = {}) {
    super(message, 'FORBIDDEN', 403, {
      type: 'authorization',
      ...extensions
    });
  }
}

// Input Validation Errors
class ValidationError extends BaseGraphQLError {
  constructor(message, field = null, value = null, extensions = {}) {
    super(message, 'VALIDATION_ERROR', 400, {
      type: 'validation',
      field,
      value,
      ...extensions
    });
  }
}

class InputError extends BaseGraphQLError {
  constructor(message, field = null, extensions = {}) {
    super(message, 'BAD_USER_INPUT', 400, {
      type: 'input',
      field,
      ...extensions
    });
  }
}

// Business Logic Errors
class BusinessLogicError extends BaseGraphQLError {
  constructor(message, businessRule = null, extensions = {}) {
    super(message, 'BUSINESS_LOGIC_ERROR', 422, {
      type: 'business',
      businessRule,
      ...extensions
    });
  }
}

class ConflictError extends BaseGraphQLError {
  constructor(message, resource = null, extensions = {}) {
    super(message, 'CONFLICT', 409, {
      type: 'conflict',
      resource,
      ...extensions
    });
  }
}

// Resource Errors
class NotFoundError extends BaseGraphQLError {
  constructor(resource = 'Resource', id = null, extensions = {}) {
    super(`${resource} not found${id ? ` with id: ${id}` : ''}`, 'NOT_FOUND', 404, {
      type: 'not_found',
      resource,
      id,
      ...extensions
    });
  }
}

class RateLimitError extends BaseGraphQLError {
  constructor(limit = null, window = null, extensions = {}) {
    const message = `Rate limit exceeded${limit ? ` (${limit} requests per ${window})` : ''}`;
    super(message, 'RATE_LIMITED', 429, {
      type: 'rate_limit',
      limit,
      window,
      retryAfter: extensions.retryAfter || 60,
      ...extensions
    });
  }
}

// External Service Errors
class ExternalServiceError extends BaseGraphQLError {
  constructor(service, message = 'External service unavailable', extensions = {}) {
    super(`${service}: ${message}`, 'EXTERNAL_SERVICE_ERROR', 502, {
      type: 'external_service',
      service,
      ...extensions
    });
  }
}

// Internal Server Errors
class InternalServerError extends BaseGraphQLError {
  constructor(message = 'Internal server error', extensions = {}) {
    super(message, 'INTERNAL_ERROR', 500, {
      type: 'internal',
      ...extensions
    });
  }
}

/**
 * Error Formatter for GraphQL responses
 * Ensures consistent error format for client consumption
 */
class GraphQLErrorFormatter {
  constructor(options = {}) {
    this.includeStackTrace = options.includeStackTrace || process.env.NODE_ENV !== 'production';
    this.logErrors = options.logErrors !== false;
    this.logger = options.logger || console;
  }

  /**
   * Format GraphQL error for client response
   */
  formatError(error) {
    // Log error for debugging
    if (this.logErrors) {
      this.logError(error);
    }

    // Handle different error types
    if (error instanceof BaseGraphQLError) {
      return this.formatCustomError(error);
    }

    if (error.originalError instanceof BaseGraphQLError) {
      return this.formatCustomError(error.originalError);
    }

    // Handle validation errors from GraphQL
    if (error.message.includes('Cannot query field')) {
      return this.formatValidationError(error);
    }

    // Handle syntax errors
    if (error.message.includes('Syntax Error')) {
      return this.formatSyntaxError(error);
    }

    // Default internal server error
    return this.formatInternalError(error);
  }

  formatCustomError(error) {
    const formatted = {
      message: error.message,
      locations: error.locations,
      path: error.path,
      extensions: {
        code: error.extensions.code,
        statusCode: error.extensions.statusCode,
        type: error.extensions.type,
        timestamp: error.extensions.timestamp
      }
    };

    // Include additional context if available
    if (error.extensions.field) {
      formatted.extensions.field = error.extensions.field;
    }

    if (error.extensions.resource) {
      formatted.extensions.resource = error.extensions.resource;
    }

    // Include stack trace in development
    if (this.includeStackTrace && error.stack) {
      formatted.extensions.stackTrace = error.stack.split('\n');
    }

    return formatted;
  }

  formatValidationError(error) {
    return {
      message: error.message,
      locations: error.locations,
      path: error.path,
      extensions: {
        code: 'GRAPHQL_VALIDATION_FAILED',
        statusCode: 400,
        type: 'validation',
        timestamp: new Date().toISOString()
      }
    };
  }

  formatSyntaxError(error) {
    return {
      message: 'GraphQL syntax error',
      locations: error.locations,
      extensions: {
        code: 'GRAPHQL_SYNTAX_ERROR',
        statusCode: 400,
        type: 'syntax',
        originalMessage: error.message,
        timestamp: new Date().toISOString()
      }
    };
  }

  formatInternalError(error) {
    // Don't expose internal error details in production
    const message = this.includeStackTrace ? error.message : 'Internal server error';
    
    const formatted = {
      message,
      locations: error.locations,
      path: error.path,
      extensions: {
        code: 'INTERNAL_ERROR',
        statusCode: 500,
        type: 'internal',
        timestamp: new Date().toISOString()
      }
    };

    if (this.includeStackTrace && error.stack) {
      formatted.extensions.stackTrace = error.stack.split('\n');
    }

    return formatted;
  }

  logError(error) {
    const logData = {
      message: error.message,
      code: error.extensions?.code || 'UNKNOWN',
      type: error.extensions?.type || 'unknown',
      path: error.path,
      timestamp: new Date().toISOString(),
      stack: error.stack
    };

    // Log different levels based on error type
    if (error.extensions?.statusCode >= 500) {
      this.logger.error('GraphQL Error:', logData);
    } else if (error.extensions?.statusCode >= 400) {
      this.logger.warn('GraphQL Warning:', logData);
    } else {
      this.logger.info('GraphQL Info:', logData);
    }
  }
}

/**
 * Error Utilities for common operations
 */
class ErrorUtils {
  /**
   * Assert user authentication
   */
  static requireAuth(user, message = 'Authentication required') {
    if (!user) {
      throw new AuthenticationError(message);
    }
    return user;
  }

  /**
   * Assert user permissions
   */
  static requirePermission(user, permission, message = null) {
    ErrorUtils.requireAuth(user);
    
    if (!user.permissions?.includes(permission)) {
      throw new AuthorizationError(
        message || `Permission required: ${permission}`
      );
    }
  }

  /**
   * Assert resource ownership
   */
  static requireOwnership(user, resource, message = null) {
    ErrorUtils.requireAuth(user);
    
    if (resource.userId !== user.id && !user.isAdmin) {
      throw new AuthorizationError(
        message || 'Access denied: insufficient permissions'
      );
    }
  }

  /**
   * Validate required fields
   */
  static validateRequired(input, requiredFields) {
    const missing = requiredFields.filter(field => !input[field]);
    
    if (missing.length > 0) {
      throw new ValidationError(
        `Missing required fields: ${missing.join(', ')}`,
        missing[0]
      );
    }
  }

  /**
   * Validate email format
   */
  static validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new ValidationError('Invalid email format', 'email', email);
    }
  }

  /**
   * Handle async operations with error context
   */
  static async withErrorContext(operation, context = {}) {
    try {
      return await operation();
    } catch (error) {
      if (error instanceof BaseGraphQLError) {
        // Re-throw custom errors with additional context
        error.extensions = { ...error.extensions, ...context };
        throw error;
      }
      
      // Wrap unknown errors
      throw new InternalServerError(error.message, context);
    }
  }
}

/**
 * Field-level error collection for mutations
 */
class FieldErrorCollector {
  constructor() {
    this.errors = [];
  }

  addError(field, message) {
    this.errors.push({ field, message });
  }

  addValidationError(field, value, message) {
    this.errors.push({
      field,
      message,
      value: typeof value === 'string' ? value : JSON.stringify(value)
    });
  }

  hasErrors() {
    return this.errors.length > 0;
  }

  throw(primaryMessage = 'Validation failed') {
    if (this.hasErrors()) {
      throw new ValidationError(primaryMessage, null, null, {
        fieldErrors: this.errors
      });
    }
  }

  getFormattedErrors() {
    return this.errors;
  }
}

module.exports = {
  // Error Classes
  BaseGraphQLError,
  AuthenticationError,
  AuthorizationError,
  ValidationError,
  InputError,
  BusinessLogicError,
  ConflictError,
  NotFoundError,
  RateLimitError,
  ExternalServiceError,
  InternalServerError,
  
  // Utilities
  GraphQLErrorFormatter,
  ErrorUtils,
  FieldErrorCollector
}; 