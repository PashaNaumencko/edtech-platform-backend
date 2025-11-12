export class DomainError extends Error {
  constructor(message: string, public readonly code: string, public readonly field?: string) {
    super(message);
    this.name = "DomainError";
  }
}
