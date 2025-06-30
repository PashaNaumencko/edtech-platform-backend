/**
 * Generic interface for use cases following the Use Case pattern.
 * Each use case represents a single business operation or workflow.
 *
 * @template TRequest - The input type for the use case
 * @template TResponse - The output type for the use case
 */
export interface IUseCase<TRequest = void, TResponse = void> {
  /**
   * Executes the use case with the provided request.
   *
   * @param request - The input data for the use case
   * @returns Promise resolving to the use case response
   */
  execute(request: TRequest): Promise<TResponse>;
}

/**
 * Base class for use case requests.
 * Provides common validation and transformation methods.
 */
export abstract class BaseUseCaseRequest {
  /**
   * Validates the request data.
   * Should be implemented by concrete request classes.
   */
  abstract validate(): void;

  /**
   * Transforms the request data if needed.
   * Can be overridden by concrete request classes.
   */
  transform?(): this;
}

/**
 * Base class for use case responses.
 * Provides common serialization methods.
 */
export abstract class BaseUseCaseResponse {
  /**
   * Converts the response to a plain object for API responses.
   */
  abstract toPlainObject(): Record<string, any>;

  /**
   * Converts the response to JSON string.
   */
  toJSON(): string {
    return JSON.stringify(this.toPlainObject());
  }
}

/**
 * Interface for use cases that don't require input parameters.
 */
export interface IQueryUseCase<TResponse = void> extends IUseCase<void, TResponse> {
  execute(): Promise<TResponse>;
}

/**
 * Interface for use cases that don't return data (commands).
 */
export interface ICommandUseCase<TRequest = void> extends IUseCase<TRequest, void> {
  execute(request: TRequest): Promise<void>;
}

/**
 * Type utility for extracting request type from use case.
 */
export type UseCaseRequest<T> = T extends IUseCase<infer R, any> ? R : never;

/**
 * Type utility for extracting response type from use case.
 */
export type UseCaseResponse<T> = T extends IUseCase<any, infer R> ? R : never;
