import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  constructor() {}
  getWelcomeMessage(): Record<string, string> {
    return { message: 'API is Healthy' };
  }
}
