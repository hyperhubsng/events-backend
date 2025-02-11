import 'reflect-metadata';
import { Inject, Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { WINSTON_MODULE_PROVIDER, WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import 'winston-daily-rotate-file';
import { MongooseModule } from '@nestjs/mongoose';
import { logFile, mongooseConfig } from '@/config';
import { ConfigModule } from '@nestjs/config';
import { RedisModule } from '@/datasources/redis/redis.module';
import { FeaturesModule } from '@/features/features.module';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { Logger } from 'winston';
import * as _ from 'lodash';

@Module({
  imports: [
    WinstonModule.forRoot({
      transports: [
        new winston.transports.DailyRotateFile(logFile),
        new winston.transports.Console(),
      ],
    }),
    RedisModule,
    MongooseModule.forRoot(
      mongooseConfig.connectionString.organisation,
      mongooseConfig.organisation,
    ),
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    EventEmitterModule.forRoot(),
    FeaturesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
  exports: [],
})
export class AppModule {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly logger: Logger,
  ) {
    _.set(global, 'logger', this.logger);
  }
}
