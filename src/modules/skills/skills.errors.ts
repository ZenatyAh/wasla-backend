export class SkillError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = "SkillError";
    this.statusCode = statusCode;
  }
}
