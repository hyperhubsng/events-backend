import Redis from "ioredis";
import { REDIS_SOURCE } from "@/constants";
import { ConfigService } from "@nestjs/config";

export type RedisClient = Redis;
export const redisProviders = [
  {
    provide: REDIS_SOURCE,
    inject: [ConfigService],
    useFactory: async (configService: ConfigService) => {
      return new Redis(String(configService.get<string>("REDIS_URL")));
    },
  },
];
