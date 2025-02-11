import { Inject, Injectable } from '@nestjs/common';
import { RedisClient } from './redis.providers';
import { REDIS_SOURCE } from '@/constants';

@Injectable()
export class RedisService {
  public constructor(
    @Inject(REDIS_SOURCE)
    private readonly client: RedisClient,
  ) {}

  set(key: string, value: string | number) {
    return this.client.set(key, value);
  }

  setEx(key: string, value: string, expirationSeconds: number) {
    return this.client.setex(key, expirationSeconds, value);
  }

  get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  incrFloat(key: string, value: number) {
    return this.client.incrbyfloat(key, value);
  }

  remove(key: string) {
    return this.client.del(key);
  }
}
