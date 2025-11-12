import { DomainError } from "../errors";
import { ValueObject } from "./value-object.base";

export class Email extends ValueObject<string> {
  protected validate(value: string): void {
    if (!value?.trim()) {
      throw new DomainError("Email is required", "EMAIL_REQUIRED");
    }

    if (value.length > 254) {
      throw new DomainError("Email address is too long", "EMAIL_TOO_LONG");
    }

    if (!value.includes("@")) {
      throw new DomainError("Email must contain @ symbol", "EMAIL_MISSING_AT");
    }
  }

  static create(value: string): Email {
    return new Email(value?.toLowerCase().trim());
  }

  get domain(): string {
    return this.value.split("@")[1];
  }
}
