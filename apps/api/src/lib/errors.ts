import type { ContentfulStatusCode } from "hono/utils/http-status";

export class HttpError extends Error {
  constructor(
    public status: ContentfulStatusCode,
    public code: string,
    message: string,
    public issues?: unknown,
  ) {
    super(message);
  }
}

export const unauthorized = (code = "UNAUTHORIZED", message = "Faça login para continuar") =>
  new HttpError(401, code, message);
export const forbidden = (code = "FORBIDDEN", message = "Você não tem permissão para isso") =>
  new HttpError(403, code, message);
export const notFound = (message = "Não encontrado") => new HttpError(404, "NOT_FOUND", message);
export const conflict = (code: string, message: string) => new HttpError(409, code, message);
export const badRequest = (code: string, message: string, issues?: unknown) =>
  new HttpError(400, code, message, issues);
