import { DomainError } from "../errors";
import { ValueObject } from "./value-object.base";

export abstract class Identifier extends ValueObject<string> {
  protected validate(value: string): void {
    if (!value?.trim()) {
      throw new DomainError(`${this.constructor.name} is required`, "IDENTIFIER_REQUIRED");
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(value)) {
      throw new DomainError(`Invalid ${this.constructor.name} format`, "IDENTIFIER_INVALID");
    }
  }

  static generate<T extends Identifier>(this: new (value: string) => T): T {
    return new this(crypto.randomUUID());
  }

  static from<T extends Identifier>(this: new (value: string) => T, value: string): T {
    return new this(value);
  }
}
