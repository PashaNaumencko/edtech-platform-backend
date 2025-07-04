import { IsOptional, IsString } from "class-validator";

/**
 * Error Detail DTO
 *
 * Detailed error information for debugging
 */
export class ErrorDetailDto {
  @IsString()
  field?: string;

  @IsString()
  message: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  value?: string;

  constructor(message: string, field?: string, code?: string, value?: string) {
    this.message = message;
    this.field = field;
    this.code = code;
    this.value = value;
  }
}
