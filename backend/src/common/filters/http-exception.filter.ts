import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL_ERROR';
    let message = 'Une erreur interne est survenue';
    let details: unknown = undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const res = exceptionResponse as Record<string, unknown>;
        message = (res['message'] as string) ?? exception.message;
        code = (res['code'] as string) ?? `HTTP_${status}`;
        details = res['details'];
      } else {
        message = exceptionResponse as string;
        code = `HTTP_${status}`;
      }
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      status = HttpStatus.CONFLICT;
      code = `PRISMA_${exception.code}`;

      switch (exception.code) {
        case 'P2002':
          message = 'Une entrée avec ces données existe déjà (contrainte d\'unicité)';
          details = { fields: exception.meta?.['target'] };
          break;
        case 'P2025':
          status = HttpStatus.NOT_FOUND;
          message = 'Enregistrement introuvable';
          break;
        case 'P2003':
          status = HttpStatus.BAD_REQUEST;
          message = 'Référence invalide (clé étrangère)';
          break;
        default:
          message = 'Erreur base de données';
      }
    } else if (exception instanceof Prisma.PrismaClientValidationError) {
      status = HttpStatus.BAD_REQUEST;
      code = 'PRISMA_VALIDATION';
      message = 'Données invalides pour la base de données';
    }

    if (status >= 500) {
      this.logger.error(
        `${request.method} ${request.url} → ${status}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    } else {
      this.logger.warn(`${request.method} ${request.url} → ${status}: ${message}`);
    }

    response.status(status).json({
      success: false,
      error: {
        code,
        message,
        ...(details !== undefined && { details }),
      },
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
