import { Injectable } from '@nestjs/common';
import { appConfig } from '@/config';
import { JwtService } from '@nestjs/jwt';
import {
  ILoginData,
  ILoginResponse,
  ITemporaryUserResponse,
  JwtUnion,
} from '@/shared/interface/interface';
import { UserService } from '../user/user.service';
import { getTempUserKey, responseHash } from '@/constants';
import * as bcrypt from 'bcryptjs';
import {
  AuthVerifyAccountDTO,
  ForgotPasswordDTO,
  SetPasswordDTO,
} from './auth.dto';
import { RedisService } from '@/datasources/redis/redis.service';
import otpGenerator from '@/shared/utils/otp-generator';
import { User } from '@/datasources/mongodb/schemas/user.schema';
import {
  computeProfileCompletionStatus,
  stringnifyPercent,
} from '@/shared/utils/compute-profile-completion';
import { AddUserDTO,  } from '../user/user.dto';
import { v4 as uuid } from 'uuid';
@Injectable()
export class AuthService {
  jwtAudience = appConfig.jwtAudience;
  jwtIssuer = appConfig.jwtIssuer;
  secret = appConfig.secret;
  otpDuration = appConfig.otpDuration;
  constructor(
    private readonly jwtService: JwtService,
    private readonly userService: UserService,
    private readonly redisService: RedisService,
  ) {}

  async generateAuthToken(data: User): Promise<string> {
    try {
      const { _id: userId, firstName, lastName, email } = data;
      const payload: JwtUnion = {
        firstName,
        lastName,
        email,
        userId,
        sub: userId,
        subject: String(userId),
      };

      const expirationTimeInSeconds = 60 * 60 * 24 * 30;
      return await this.jwtService.signAsync(payload, {
        secret: this.secret,
        expiresIn: expirationTimeInSeconds,
      });
    } catch (e) {
      return Promise.reject(e);
    }
  }

  private async loginResponseTransformer(
    token: string,
    user: User,
  ): Promise<ILoginResponse> {
    const {
      _id: userId,
      email,
      firstName,
      lastName,
      profileImageUrl,
      userType
    } = user;
    return {
      userId,
      firstName,
      lastName,
      email,
      token,
      profileImageUrl : profileImageUrl || "",
      userType
    };
  }

  async authenticateLogin(loginData: ILoginData) {
    try {
      const { email, password } = loginData;
      const user = await this.userService.getUser({ email });
      if (!user) {
        return Promise.reject(responseHash.invalidCredentials);
      }
      const isPasswordCorrect = await bcrypt.compare(password, user.password);
      if (!isPasswordCorrect) {
        return Promise.reject(responseHash.invalidCredentials);
      }
      const token = await this.generateAuthToken(user);
      return await this.loginResponseTransformer(token, user);
    } catch (e) {
      return Promise.reject(e);
    }
  }

  async storeTemporaryRegistration(
    email: string,
    userData:  AddUserDTO,
  ): Promise<ITemporaryUserResponse> {
    try {
      const reference = appConfig.isLive ? otpGenerator.generate(6) : '123456';
      this.promiseToCacheData(email, userData, reference);
      const message = `We sent a 6 digit OTP to ${email}. Verify your account to proceed`;
      return {
        message,
        otpEmail: email,
        expirationTime: this.otpDuration,
        durationType: 'seconds',
      };
    } catch (e) {
      return Promise.reject(e);
    }
  }

  async promiseToCacheData(
    email: string,
    userData:  AddUserDTO,
    reference: string,
  ) {
    try {
      const tempUserCacheKey = getTempUserKey(email + reference);
      return await Promise.all([
        //Store the user as a temporary user
        this.redisService.setEx(
          `${tempUserCacheKey}`,
          JSON.stringify(userData),
          appConfig.otpDuration,
        ),
        this.redisService.setEx(
          getTempUserKey(email),
          email,
          appConfig.otpDuration,
        ),
      ]);
    } catch (e) {
      return Promise.reject(e);
    }
  }

  async onboardUser(body: AddUserDTO) : Promise<ITemporaryUserResponse> {
    try {
      const { email, phoneNumber , companyName , website } = body;
      //Check to Uniqueness of Data 
      await this.userService.checkUserUniqueness(
        [{ email }, { phoneNumber } , {companyName} , {website}],
        true,
      ); 
      return await this.storeTemporaryRegistration(email, body);
    } catch (e) {
      return Promise.reject(e);
    }
  }

  async verifyOTP<T>(
    body: AuthVerifyAccountDTO,
    otpKey: string,
    clearCacheFn: (payload: any) => Promise<any>,
    callback: (payload: T) => Promise<any>,
  ) {
    try {
      const { otp } = body;

      if (!appConfig.isLive && !Object.is(appConfig.devOTP, otp)) {
        return Promise.reject(responseHash.invalidOTP);
      }

      const otpData = (await this.redisService.get(otpKey)) as string;
      if (!otpData) {
        return Promise.reject(responseHash.invalidOTP);
      }
      const payload = JSON.parse(otpData) as unknown;
      await clearCacheFn(body);
      return await callback(payload as T);
    } catch (e) {
      return Promise.reject(e);
    }
  }

  async verifyUserRegistration(body: AuthVerifyAccountDTO) {
    try {
      return await this.verifyOTP<AuthVerifyAccountDTO>(
        body,
        getTempUserKey(body.otpEmail + body.otp),
        this.clearCache.bind(this),
        this.createUser.bind(this),
      );
    } catch (e) {
      return Promise.reject(e);
    }
  }

  async clearCache(body: AuthVerifyAccountDTO): Promise<void> {
    try {
      const { otpEmail, otp } = body;
      await Promise.all([
        this.redisService.remove(getTempUserKey(otpEmail)),
        this.redisService.remove(getTempUserKey(otpEmail + otp)),
      ]);
    } catch (e) {
      return Promise.reject(e);
    }
  }

  async createUser(body: any) {
    try {
      const user = await this.userService.addUser(body);
      const token = await this.generateAuthToken(user);
      return await this.loginResponseTransformer(
        token,
        await this.userService.getUserById(user._id),
      );
    } catch (e) {
      return Promise.reject(e);
    }
  }

  async handleForgotPassword(body: ForgotPasswordDTO) {
    try {
      let { email } = body;
      email = email.trim().replace(/\s+/g, '');
      const user = await this.userService.getUser({ email });
      if (!user) {
        return Promise.reject({
          ...responseHash.notFound,
          message: 'Sorry,try again',
        });
      }
      const token = appConfig.isLive ? otpGenerator.generate(6) : '123456';
      await this.redisService.setEx(
        `verify:reset:password:${email}:${token}`,
        JSON.stringify({ email, token }),
        this.otpDuration,
      );
      return {
        message: `A  reset code  has been sent to ${email}`,
        otpEmail: email,
        expirationTime: this.otpDuration,
        durationType: 'seconds',
      };
    } catch (err) {
      return Promise.reject(err);
    }
  }

  async setNewPassword(body: SetPasswordDTO): Promise<boolean | undefined> {
    try {
      const { resetToken, password } = body;
      const cacheKey = `set:password:${resetToken}`;

      const cachedEmail = await this.redisService.get(cacheKey);

      if (!cachedEmail) {
        return Promise.reject({
          ...responseHash.invalidOTP,
          message: 'Token has expired',
        });
      }
      const user = await this.userService.getUser({ email: cachedEmail });
      await Promise.all([
        this.userService.updateUser({ password }, user),
        this.redisService.remove(cacheKey),
      ]);
      return true;
    } catch (err) {
      return Promise.reject(err);
    }
  }

  async verifyResetPassword(accountData: AuthVerifyAccountDTO) {
    try {
      const { otp, otpEmail } = accountData;
      const cacheKey = `verify:reset:password:${otpEmail}:${otp}`;
      return await this.verifyOTP<AuthVerifyAccountDTO>(
        accountData,
        cacheKey,
        this.removeResetKey.bind(this),
        this.generateResetToken.bind(this),
      );
    } catch (e) {
      return Promise.reject(e);
    }
  }
  async removeResetKey(body: AuthVerifyAccountDTO) {
    try {
      const { otp, otpEmail } = body;
      const resetKey = `reset:password:${otpEmail}:${otp}`;
      return await this.redisService.remove(resetKey);
    } catch (e) {
      return Promise.reject(e);
    }
  }

  async generateResetToken(payload: any) {
    try {
      const { email } = payload;
      const user = await this.userService.getUser({ email });
      if (!user) {
        return Promise.reject({
          ...responseHash.notFound,
          message: 'A user with the verification email does not exists',
        });
      }
      const resetKey = uuid();
      await Promise.all([
        this.redisService.setEx(
          `set:password:${resetKey}`,
          email,
          this.otpDuration,
        ),
      ]);
      return {
        message: `Reset password verification was successful`,
        resetToken: resetKey,
      };
    } catch (e) {
      return Promise.reject(e);
    }
  }
}
