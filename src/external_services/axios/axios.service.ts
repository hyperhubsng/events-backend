import { Injectable } from '@nestjs/common';
import axios, { AxiosBasicCredentials, Method, ResponseType } from 'axios';

interface AxiosData {
  url: string;
  data?: any;
  responseType: ResponseType;
  headers?: any;
  params?: any;
  auth?: AxiosBasicCredentials;
  httpsAgent?: any;
  method: Method;
}

@Injectable()
export class AxiosService {
  constructor() {}

  Request(payload: AxiosData) {
    const {
      url,
      data,
      method,
      responseType,
      headers,
      auth,
      httpsAgent,
      params,
    } = payload;
    return axios.request({
      url,
      data,
      responseType,
      headers,
      method,
      params,
      timeout: 45000,
      auth,
      httpsAgent,
    });
  }
}
