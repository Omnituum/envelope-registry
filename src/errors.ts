export class EnvelopeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EnvelopeError';
  }
}

export class UnsupportedVersionError extends EnvelopeError {
  constructor(public readonly version: string) {
    super(`Unsupported envelope version: "${version}"`);
    this.name = 'UnsupportedVersionError';
  }
}

export class ValidationError extends EnvelopeError {
  constructor(
    message: string,
    public readonly errors: string[],
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}
