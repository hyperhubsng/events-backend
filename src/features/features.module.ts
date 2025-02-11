import { Module } from '@nestjs/common';

import {
  MongoDataServices,
  NosqlService,
} from '@/datasources/mongodb/mongodb.service';
import { MongooseModule } from '@nestjs/mongoose';

import { User, UserSchema } from '@/datasources/mongodb/schemas/user.schema';
import { ErrorService } from '@/shared/errors/errors.service';

import { JwtModule, JwtService } from '@nestjs/jwt';
import { RedisService } from '@/datasources/redis/redis.service';
import { redisProviders } from '@/datasources/redis/redis.providers';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ErrorInterceptor } from '@/shared/errors/error-interceptor';
import { SuccessResponse } from '@/shared/response/success-response';
import { AuthController } from './auth/auth.controller';
import { AuthService } from './auth/auth.service';
import { UserService } from './user/user.service';
import { AuthGuard } from './auth/auth.guard';
import { UserController } from './user/user.controller';
import {
  Payment,
  PaymentSchema,
} from '@/datasources/mongodb/schemas/payment.schema';
import { PaymentService } from './payment/payment.service';
import {
  PaymentLog,
  PaymentLogSchema,
} from '@/datasources/mongodb/schemas/paymentLog.schema';
import { EventManager } from '@/shared/event/event.manager';
import {
  Event , 
  EventSchema
} from '@/datasources/mongodb/schemas/event.schema';
import {
 Attendee,
 AttendeeSchema
} from '@/datasources/mongodb/schemas/attendee.schema';
import { Ticket , TicketSchema } from '@/datasources/mongodb/schemas/ticket.schema';
// import { CommunityService } from './event/community.service';
// import { MemberController } from './attendee/member.controller';
// import { MatchService } from './ticket/match.service';
// import { MatchController } from './ticket/match.controller';
// import { CommunityController } from './event/community.controllers';

@Module({
  controllers: [
    AuthController,
    UserController,
  ],
  providers: [
    ...redisProviders,
    JwtService,
    {
      provide: MongoDataServices,
      useClass: NosqlService,
    },
    {
      provide: APP_FILTER,
      useClass: ErrorInterceptor,
    },
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
    ErrorService,
    RedisService,
    SuccessResponse,
    AuthService,
    UserService,
    PaymentService,
    EventManager,
  ],
  imports: [
    MongooseModule.forFeature(
      [
        {
          name: User.name,
          schema: UserSchema,
        },
        {
          name: Payment.name,
          schema: PaymentSchema,
        },
        {
          name: PaymentLog.name,
          schema: PaymentLogSchema,
        },
        {
          name: Event.name,
          schema: EventSchema,
        },
        {
          name: Ticket.name,
          schema: TicketSchema,
        },
        {
          name: Attendee.name,
          schema: AttendeeSchema,
        },
      ],
      'hyperhubs',
    ),
    JwtModule.register({
      global: true,
    }),
  ],
})
export class FeaturesModule {}
