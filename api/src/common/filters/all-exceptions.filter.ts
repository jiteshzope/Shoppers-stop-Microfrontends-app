import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Request, Response } from 'express';

/** Statuses at or above this are our fault, so they are worth a stack trace. */
const SERVER_ERROR_FLOOR: number = HttpStatus.INTERNAL_SERVER_ERROR;

interface ErrorBody {
  statusCode: number;
  message: string;
  /** Field-level detail from the validation pipe, when there is any. */
  errors?: string[];
  path: string;
  timestamp: string;
}

/**
 * Single exit point for failures.
 *
 * Expected `HttpException`s keep their status and their stable, client-facing
 * code; everything else is logged in full and reported as a generic 500, so no
 * internal detail — a stack trace, a SQL constraint name — ever reaches a
 * client.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request>();

    const body = this.toErrorBody(exception, request);

    if (body.statusCode >= SERVER_ERROR_FLOOR) {
      this.logger.error(
        `${request.method} ${request.url} failed`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    response.status(body.statusCode).json(body);
  }

  private toErrorBody(exception: unknown, request: Request): ErrorBody {
    const base = { path: request.url, timestamp: new Date().toISOString() };

    if (exception instanceof HttpException) {
      const payload = exception.getResponse();
      const { message, errors } = this.readHttpExceptionPayload(payload, exception.message);

      return { statusCode: exception.getStatus(), message, ...(errors ? { errors } : {}), ...base };
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      return { ...this.mapPrismaError(exception), ...base };
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'INTERNAL_SERVER_ERROR',
      ...base,
    };
  }

  private readHttpExceptionPayload(
    payload: string | object,
    fallback: string,
  ): { message: string; errors?: string[] } {
    if (typeof payload === 'string') {
      return { message: payload };
    }

    const record = payload as { message?: unknown; error?: unknown };

    // The validation pipe reports an array of field messages. The first one
    // becomes the headline; the whole list is kept under `errors`.
    if (Array.isArray(record.message)) {
      const errors = record.message.map(String);
      return { message: errors[0] ?? fallback, errors };
    }

    if (typeof record.message === 'string') {
      return { message: record.message };
    }

    return { message: fallback };
  }

  private mapPrismaError(error: Prisma.PrismaClientKnownRequestError): {
    statusCode: number;
    message: string;
  } {
    switch (error.code) {
      case 'P2002':
        return { statusCode: HttpStatus.CONFLICT, message: 'RESOURCE_ALREADY_EXISTS' };
      case 'P2003':
        return { statusCode: HttpStatus.BAD_REQUEST, message: 'RELATED_RESOURCE_NOT_FOUND' };
      case 'P2025':
        return { statusCode: HttpStatus.NOT_FOUND, message: 'RESOURCE_NOT_FOUND' };
      default:
        this.logger.error(`Unmapped Prisma error ${error.code}`, error.stack);
        return { statusCode: HttpStatus.INTERNAL_SERVER_ERROR, message: 'INTERNAL_SERVER_ERROR' };
    }
  }
}
