import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';
import { ZodError } from 'zod';

@Catch()
export class ProblemFilter implements ExceptionFilter {
  catch(error: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<
      Request & { id?: string; log?: { error: (data: unknown, msg: string) => void } }
    >();
    const response = ctx.getResponse<Response>();
    // Shared schemas can cross the CJS/ESM boundary, where instanceof is not reliable.
    const validationError =
      error instanceof ZodError ||
      (error instanceof Error &&
        error.name === 'ZodError' &&
        Array.isArray((error as ZodError).issues))
        ? (error as ZodError)
        : undefined;
    const parserError =
      typeof error === 'object' &&
      error !== null &&
      'type' in error &&
      ['entity.parse.failed', 'entity.too.large'].includes(String(error.type));
    const status = parserError
      ? 'type' in error! && error.type === 'entity.too.large'
        ? 413
        : 400
      : validationError
        ? 400
        : error instanceof HttpException
          ? error.getStatus()
          : HttpStatus.INTERNAL_SERVER_ERROR;
    const details = error instanceof HttpException ? error.getResponse() : null;
    const structured =
      typeof details === 'object' && details !== null ? (details as Record<string, unknown>) : {};
    const code =
      typeof structured.code === 'string'
        ? structured.code
        : status === 400
          ? 'VALIDATION_ERROR'
          : status === 401
            ? 'UNAUTHENTICATED'
            : status === 403
              ? 'FORBIDDEN'
              : status === 404
                ? 'NOT_FOUND'
                : status === 409
                  ? 'CONFLICT'
                  : status === 429
                    ? 'RATE_LIMITED'
                    : 'REQUEST_FAILED';
    const message =
      status >= 500
        ? 'No pudimos completar la solicitud. Intenta nuevamente.'
        : parserError
          ? status === 413
            ? 'El contenido supera el tamaño permitido.'
            : 'Envía un cuerpo JSON válido.'
          : validationError
            ? 'Revisa los datos enviados.'
            : typeof structured.message === 'string'
              ? structured.message
              : typeof details === 'string'
                ? details
                : 'La solicitud no se puede completar.';
    if (status >= 500)
      request.log?.error(
        {
          errorType: error instanceof Error ? error.name : 'UnknownError',
          errorCode:
            typeof error === 'object' && error !== null && 'code' in error
              ? String(error.code)
              : undefined,
          stackFrames:
            error instanceof Error
              ? error.stack?.split('\n').filter((line) => line.trimStart().startsWith('at '))
              : undefined,
          requestId: request.id,
        },
        'Request failed',
      );
    response
      .status(status)
      .type('application/problem+json')
      .json({
        type: `urn:reservas:problem:${code.toLowerCase()}`,
        title: message,
        status,
        detail: message,
        code,
        requestId: request.id,
        instance: request.path,
        ...(code === 'GUEST_CHALLENGE_REQUIRED' && structured.challenge
          ? { challenge: structured.challenge }
          : {}),
        ...(validationError
          ? {
              errors: validationError.issues.map((issue) => ({
                path: issue.path.join('.'),
                message: issue.message,
              })),
            }
          : {}),
      });
  }
}
