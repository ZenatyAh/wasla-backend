export class ReviewError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = "ReviewError";
    this.statusCode = statusCode;
  }
}
