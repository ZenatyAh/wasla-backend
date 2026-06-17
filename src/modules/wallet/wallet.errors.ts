export class WalletError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = "WalletError";
    this.statusCode = statusCode;
  }
}
