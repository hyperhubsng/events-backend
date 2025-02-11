import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
  Inject,
} from '@nestjs/common';
import { Response } from 'express';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { HttpArgumentsHost } from '@nestjs/common/interfaces';

@Catch()
export class ErrorInterceptor implements ExceptionFilter {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly logger: Logger,
  ) {}

  catch(exception: any, host: ArgumentsHost) {
    const ctx: HttpArgumentsHost = host.switchToHttp();
    const response: Response = ctx.getResponse<Response>();
    const exceptionMessage = exception.response
      ? exception.response.message
      : 'Internal Server Error';
    const exceptionStatus = exception.response
      ? exception.response.status
      : HttpStatus.INTERNAL_SERVER_ERROR;
    const message = exception.message || exceptionMessage;
    const status: number = exception.status || exceptionStatus;
    const exceptionErrorCode = exception.response
      ? exception.response.code
      : 'MELO00100';

    switch (exception.name) {
      case 'CustomGuardException':
        break;
      case 'AxiosError':
        this.logger.error({
          message: message,
          url: exception.config.url,
          payload: exception.config.data,
        });
        break;
      default:
        this.logger.error({
          message: message,
          stack: exception.stack,
        });
    }
    const errorCode: string | number | undefined =
      exception.code || exceptionErrorCode;
    const statusCode = status || 500;
    response.status(statusCode).json({
      status: status >= 500 ? 'pending' : 'failed',
      message: status >= 500 ? 'Oops! something went wrong' : message,
      code: errorCode,
    });
  }
}
