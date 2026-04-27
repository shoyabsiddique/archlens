export class ArchLensError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "ArchLensError";
  }
}

export class ConfigError extends ArchLensError {
  constructor(message: string, options?: ErrorOptions) {
    super(message, "CONFIG_ERROR", options);
    this.name = "ConfigError";
  }
}

export class ValidationError extends ArchLensError {
  constructor(message: string, options?: ErrorOptions) {
    super(message, "VALIDATION_ERROR", options);
    this.name = "ValidationError";
  }
}
