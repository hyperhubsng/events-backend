import { Request, Response } from 'express';
import { ErrorService } from '../errors/errors.service';
import { IResponseInterface } from '../interface/interface';
import { Injectable } from '@nestjs/common';
import { responseHash } from '@/constants';
@Injectable()
export class SuccessResponse {
  constructor(private readonly errorService: ErrorService) {}

  async ok(
    res: Response,
    req: Request | any,
    responseData: IResponseInterface,
  ) {
    try {
      const { data, cache, pagination } = responseData;
      const message = data.message || responseHash.success.message;
      const response: Record<string, any> = {};
      if (data.hasOwnProperty('message')) {
        delete data.message;
      }
      if (cache) {
        response.response = data;
        response.response.cached = cache;
      } else {
        response.response = {
          status: 'success',
          data: data,
          message,
          code: responseHash.success.code,
        };
      }

      if (pagination) {
        response.response = {
          ...response.response,
          pagination,
        };
      }
      return res.status(200).json({
        ...response.response,
        csrfToken: req['csrfToken'],
      });
    } catch (e) {
      return this.errorService.controllerError(e);
    }
  }
}
