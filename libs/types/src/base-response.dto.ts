import { Type, plainToClass } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsDate,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from "class-validator";

/**
 * Base Response DTO with common fields
 */
export abstract class BaseResponseDto {
  @IsDate()
  @Type(() => Date)
  timestamp: Date = new Date();

  /**
   * Transforms plain object to instance
   */
  static fromPlain<T extends BaseResponseDto>(
    this: new (...args: any[]) => T,
    plainObject: any,
  ): T {
    return plainToClass(this, plainObject);
  }
}

/**
 * Success Response DTO
 *
 * Simple wrapper for successful responses - no success flag or message needed
 */
export class SuccessResponseDto<T = any> extends BaseResponseDto {
  @IsOptional()
  data?: T;

  constructor(data?: T) {
    super();
    this.data = data;
  }

  /**
   * Creates a success response
   */
  static create<T>(data?: T): SuccessResponseDto<T> {
    return new SuccessResponseDto<T>(data);
  }
}

/**
 * Error Response DTO
 *
 * Standardized error response format
 */
export class ErrorResponseDto extends BaseResponseDto {
  @IsString()
  message: string;

  @IsArray()
  errors: string[];

  constructor(message: string, errors: string[]) {
    super();
    this.message = message;
    this.errors = errors;
  }

  /**
   * Creates an error response
   */
  static create(message: string, errors: string[]): ErrorResponseDto {
    return new ErrorResponseDto(message, errors);
  }
}

/**
 * Pagination Metadata Parameters
 */
export interface PaginationMetaParams {
  limit: number;
  total: number;
  hasNext: boolean;
  nextCursor?: string;
  previousCursor?: string;
}

/**
 * Pagination Metadata DTO
 *
 * Simplified pagination with cursor-based approach
 */
export class PaginationMetaDto {
  @IsNumber()
  limit: number;

  @IsNumber()
  total: number;

  @IsBoolean()
  hasNext: boolean;

  @IsOptional()
  @IsString()
  nextCursor?: string;

  @IsOptional()
  @IsString()
  previousCursor?: string;

  constructor(params: PaginationMetaParams) {
    this.limit = params.limit;
    this.total = params.total;
    this.hasNext = params.hasNext;
    this.nextCursor = params.nextCursor;
    this.previousCursor = params.previousCursor;
  }

  /**
   * Creates pagination metadata
   */
  static create(params: PaginationMetaParams): PaginationMetaDto {
    return new PaginationMetaDto(params);
  }
}

/**
 * Paginated Response Parameters
 */
export interface PaginatedResponseParams<T = any> {
  items: T[];
  limit: number;
  total: number;
  hasNext: boolean;
  nextCursor?: string;
  previousCursor?: string;
}

/**
 * Paginated Response DTO
 *
 * Standardized response for paginated data
 */
export class PaginatedResponseDto<T = any> extends BaseResponseDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => Object)
  items: T[];

  @ValidateNested()
  @Type(() => PaginationMetaDto)
  pagination: PaginationMetaDto;

  constructor(items: T[], pagination: PaginationMetaDto) {
    super();
    this.items = items;
    this.pagination = pagination;
  }

  /**
   * Creates a paginated response
   */
  static create<T>(params: PaginatedResponseParams<T>): PaginatedResponseDto<T> {
    const pagination = PaginationMetaDto.create({
      limit: params.limit,
      total: params.total,
      hasNext: params.hasNext,
      nextCursor: params.nextCursor,
      previousCursor: params.previousCursor,
    });
    return new PaginatedResponseDto<T>(params.items, pagination);
  }

  /**
   * Get total count
   */
  get total(): number {
    return this.pagination.total;
  }

  /**
   * Get hasNext flag
   */
  get hasNext(): boolean {
    return this.pagination.hasNext;
  }
}

/**
 * Single Entity Response DTO
 *
 * Standardized response for single entity operations
 */
export class SingleEntityResponseDto<T = any> extends BaseResponseDto {
  @ValidateNested()
  @Type(() => Object)
  data: T;

  constructor(data: T) {
    super();
    this.data = data;
  }

  /**
   * Creates a single entity response
   */
  static create<T>(data: T): SingleEntityResponseDto<T> {
    return new SingleEntityResponseDto<T>(data);
  }
}

/**
 * List Response DTO
 *
 * Standardized response for list operations (non-paginated)
 */
export class ListResponseDto<T = any> extends BaseResponseDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => Object)
  items: T[];

  @IsNumber()
  total: number;

  constructor(items: T[]) {
    super();
    this.items = items;
    this.total = items.length;
  }

  /**
   * Creates a list response
   */
  static create<T>(items: T[]): ListResponseDto<T> {
    return new ListResponseDto<T>(items);
  }
}

/**
 * Query Parameters DTO
 *
 * Simplified query parameters for cursor-based pagination
 */
export class QueryParamsDto {
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  limit?: number = 10;

  @IsOptional()
  @IsString()
  sortBy?: string;

  @IsOptional()
  @IsString()
  sortOrder?: "asc" | "desc" = "asc";

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  cursor?: string;

  constructor(params?: Partial<QueryParamsDto>) {
    Object.assign(this, params);
  }

  /**
   * Creates query params from request
   */
  static fromRequest(query: any): QueryParamsDto {
    return plainToClass(QueryParamsDto, query);
  }

  /**
   * Gets limit for database queries
   */
  getLimit(): number {
    return this.limit || 10;
  }
}
