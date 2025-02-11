import { Module } from '@nestjs/common';
import { redisProviders } from './redis.providers';
import { RedisService } from '@/datasources/redis/redis.service';

@Module({
  providers: [...redisProviders, RedisService],
  exports: [...redisProviders, RedisService],
})
export class RedisModule {}
