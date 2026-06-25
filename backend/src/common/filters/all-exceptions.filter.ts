import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionsFilter');
  private readonly isProd = process.env.NODE_ENV === 'production';

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    // Always log the full error server-side for debugging.
    this.logger.error(
      `${request?.method} ${request?.url} -> ${status}`,
      exception instanceof Error ? exception.stack : String(exception),
    );

    if (exception instanceof HttpException) {
      // HttpExceptions carry intentional, client-safe messages — pass them through.
      const res = exception.getResponse();
      return response
        .status(status)
        .send(typeof res === 'string' ? { statusCode: status, message: res } : res);
    }

    // Unexpected error: never leak internal messages / stack traces to the client.
    return response.status(status).send({
      statusCode: status,
      message: this.isProd
        ? 'Internal server error'
        : exception instanceof Error
          ? exception.message
          : 'Internal server error',
      timestamp: new Date().toISOString(),
      path: request?.url,
    });
  }
}
