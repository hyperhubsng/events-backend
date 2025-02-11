import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { PUBLIC_ROUTE, responseHash } from '@/constants';
import { appConfig } from '@/config';
import { UserService } from '../user/user.service';
import { JwtUnion } from '@/shared/interface/interface';
import { Types } from 'mongoose';

@Injectable()
export class AuthGuard implements CanActivate {
  secret: string;

  constructor(
    private readonly jwtService: JwtService,
    private readonly reflector: Reflector,
    private readonly userService: UserService,
  ) {
    this.secret = appConfig.secret;
  }

  private static extractTokenFromHeader(request: Request): string | undefined {
    const regex = /\s+/;
    const {
      headers: { authorization },
    } = request;
    const [type, token] = String(authorization).split(regex) ?? [];
    return type === 'Bearer' ? token : undefined;
  }

  private static validateTokenExpiration(expiration: number): void {
    const currentTimestamp = Math.floor(Date.now() / 1000);
    if (expiration < currentTimestamp) {
      throw new UnauthorizedException('JWT token has expired');
    }
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      const isPublic = this.reflector.getAllAndOverride(PUBLIC_ROUTE, [
        context.getHandler(),
        context.getClass(),
      ]);
      if (isPublic) return true;

      const request = context.switchToHttp().getRequest();
      const token = AuthGuard.extractTokenFromHeader(request);

      if (!token) {
        throw new UnauthorizedException(
          'Unauthorized, provide authorization token',
        );
      }

      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.secret,
      });

      AuthGuard.validateTokenExpiration(payload.exp);
      await this.validateUser(payload, request);
      return true;
    } catch (e) {
      if (e.name === 'JsonWebTokenError') {
        throw new UnauthorizedException('Please,login again');
      }
      return Promise.reject(e);
    }
  }

  async validateUser(payload: JwtUnion, req: Request) {
    try {
      const user = await this.userService.getUserById(
        payload.userId as unknown as Types.ObjectId,
      );
      if (!user) {
        return Promise.reject(responseHash.userNotFound);
      }
      const authUser = user.toObject();
      // TODO(@BolajiOlajide): Declare user on the request object.
      (req as any).user = {
        ...authUser,
        ...payload,
      };
      return req;
    } catch (e) {
      return Promise.reject(e);
    }
  }
}
