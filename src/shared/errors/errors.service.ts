import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';

import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { IError } from '../interface/interface';

@Injectable()
export class ErrorService {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly logger: Logger,
  ) {}

  serviceError(error: Record<string, any>): any {
    switch (error.name) {
      case 'StandardError':
        this.logger.error({
          message: error.message,
          stack: error.stack,
        });
        break;
      case 'AxiosError':
        const message = error?.response?.data || error?.message;
        switch (error.code) {
          case 'ERR_BAD_RESPONSE':
            throw new HttpException(message, HttpStatus.BAD_REQUEST);
          case 'ECONNREFUSED':
            throw new HttpException(
              'Service connection refused',
              HttpStatus.SERVICE_UNAVAILABLE,
            );
          case 'ERR_NETWORK':
          case 'ETIMEDOUT':
            throw new HttpException(
              'Service not reachable',
              HttpStatus.SERVICE_UNAVAILABLE,
            );
          case 'ECONNABORTED':
            throw new HttpException(
              'API service not responding',
              HttpStatus.REQUEST_TIMEOUT,
            );
          default:
            throw new HttpException(
              'Oops! Something went wrong',
              HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
      default:
        switch (error.name) {
          case 'BadRequestException':
            throw new BadRequestException(error.message);
          case 'NotFoundException':
            throw new NotFoundException(error.message);
          case 'UnauthorizedException':
            throw new UnauthorizedException(error.message);
          case 'TokenExpiredError':
            throw new UnauthorizedException(error.message);
          case 'JsonWebTokenError':
            throw new UnauthorizedException(error.message);
          default:
            const statusCode = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
            throw new HttpException(
              {
                ...(statusCode < 400 && {
                  status: 'success',
                  data: {},
                }),
                ...(statusCode >= 400 && {
                  errors: {},
                }),
                message: error.message,
              },
              statusCode,
            );
        }
    }
  }

  controllerError(error: any): IError {
    return {
      errors: {},
      status: 'error',
      message: error.message,
      responseMessage: error.message,
    };
  }
}
