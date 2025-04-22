import { Injectable } from "@nestjs/common";
import { appConfig } from "@/config";
import { JwtService } from "@nestjs/jwt";
import {
  ILoginData,
  ILoginResponse,
  ITemporaryUserResponse,
  JwtUnion,
} from "@/shared/interface/interface";
import { UserService } from "../user/user.service";
import { USER_ADDITION_EMAIL, getTempUserKey, responseHash } from "@/constants";
import * as bcrypt from "bcryptjs";
import {
  AuthVerifyAccountDTO,
  ForgotPasswordDTO,
  SetPasswordDTO,
} from "./auth.dto";
import { RedisService } from "@/datasources/redis/redis.service";
import otpGenerator from "@/shared/utils/otp-generator";
import { User } from "@/datasources/mongodb/schemas/user.schema";
import { AddOrganisationDTO, AddUserDTO } from "../user/user.dto";
import { v4 as uuid } from "uuid";
import { AwsService } from "../aws/aws.service";
import { MongoDataServices } from "@/datasources/mongodb/mongodb.service";
import { PermissionService } from "../permission/permission.service";
import { Types } from "mongoose";
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
    private readonly awsService: AwsService,
    private readonly mongoService: MongoDataServices,
    private readonly permissionService: PermissionService,
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
      userType,
      currentOrganisation,
      organisations,
    } = user;
    const userRole = await this.permissionService.getRole({ _id: user.role });
    return {
      userId,
      firstName,
      lastName,
      email,
      token,
      profileImageUrl: profileImageUrl || "",
      userType,
      currentOrganisation: currentOrganisation || "",
      organisations: organisations || [],
      role: userRole,
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

      if (user.needsToChangePassword) {
        return Promise.reject({
          ...responseHash.invalidCredentials,
          message: "Please,reset your password first",
        });
      }
      if (user.accountStatus === "locked") {
        return Promise.reject({
          ...responseHash.invalidCredentials,
          message: "Your account is locked, please contact support",
        });
      }
      const token = await this.generateAuthToken(user);
      return await this.loginResponseTransformer(token, user);
    } catch (e) {
      return Promise.reject(e);
    }
  }

  async storeTemporaryRegistration(
    email: string,
    userData: AddUserDTO,
    businessName: string = "Anon",
    otherUser: boolean = false,
  ): Promise<ITemporaryUserResponse> {
    try {
      const reference = appConfig.isLive ? otpGenerator.generate(6) : "123456";
      this.promiseToCacheData(email, userData, reference);
      let message = `We sent a 6 digit OTP to ${email}. Verify your account to proceed`;
      if (otherUser) {
        const verificationLink = `${appConfig.secondaryUsersVerificationURL}?otp=${reference}`;
        message = `A verification email has been sent to ${email}`;
        this.awsService.sendEmail(
          ["dev@hyperhubs.net"],
          "Hyperhubs Events",
          USER_ADDITION_EMAIL({
            firstName: userData.firstName,
            lastName: userData.lastName,
            organisationName: businessName,
            link: verificationLink,
          }),
        );
      }
      return {
        message,
        otpEmail: email,
        expirationTime: this.otpDuration,
        durationType: "seconds",
      };
    } catch (e) {
      return Promise.reject(e);
    }
  }

  async promiseToCacheData(
    email: string,
    userData: AddUserDTO,
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

  async onboardUser(body: AddUserDTO): Promise<ITemporaryUserResponse> {
    try {
      const { email, phoneNumber, companyName, website } = body;
      const queryArray: Record<string, string>[] = [{ email }, { phoneNumber }];
      if (companyName) {
        queryArray.push({ companyName });
      }
      if (website) {
        queryArray.push({ website });
      }

      await this.userService.checkUserUniqueness(queryArray, true);
      return await this.storeTemporaryRegistration(email, body);
    } catch (e) {
      return Promise.reject(e);
    }
  }

  async onboardOrganiser(body: AddUserDTO): Promise<ILoginResponse> {
    try {
      const { email, phoneNumber, companyName, website } = body;
      await this.userService.checkUserUniqueness(
        [{ email }, { phoneNumber }, { companyName }, { website }],
        true,
      );
      return await this.createUser(body);
    } catch (e) {
      return Promise.reject(e);
    }
  }
  private async rejectWrongUserActor(body: AddUserDTO, actor: User) {
    const isForbidden =
      body.userType === "vendor" ||
      (body.userType === "vendorUser" &&
        !["admin", "superadmin", "vendor"].includes(
          actor.userType.toLowerCase(),
        )) ||
      (body.userType === "adminUser" && !actor.userType.includes("admin"));

    if (isForbidden) return Promise.reject(responseHash.forbiddenAction);
  }

  async addOtherUsers(
    body: AddUserDTO,
    actor: User,
  ): Promise<ITemporaryUserResponse> {
    try {
      if (
        !body.userType ||
        !["vendoruser", "adminuser"].includes(body.userType.toLowerCase())
      ) {
        return Promise.reject({
          ...responseHash.badPayload,
          message:
            "userType is a required field and correct values are [vendoruser,adminuser]",
        });
      }
      await this.rejectWrongUserActor(body, actor);
      if (!body.role) {
        return Promise.reject({
          ...responseHash.badPayload,
          message: "A role is necessary for this user",
        });
      }

      const { email, phoneNumber } = body;
      const queryArray: Record<string, string>[] = [];
      if (email) {
        queryArray.push({ email });
      }
      if (phoneNumber) {
        queryArray.push({ phoneNumber });
      }

      await this.userService.checkUserUniqueness(queryArray, true);
      const currentOrganisation =
        body.currentOrganisation || actor.currentOrganisation;
      if (!currentOrganisation) {
        return Promise.reject({
          ...responseHash.badPayload,
          message: "The user data must have a currentOrganisation property",
        });
      }
      const isValidRole = await this.permissionService.getRole(
        {
          _id: new Types.ObjectId(body.role),
          organisationId: new Types.ObjectId(currentOrganisation),
        },
        true,
      );
      const organisations = [currentOrganisation];

      body.accountStatus = "locked";
      body.needsToChangePassword = true;
      body.organisations = organisations;
      body.currentOrganisation = currentOrganisation;
      body.role = new Types.ObjectId(isValidRole._id);
      let companyName = "";
      if (Object.is(actor._id, currentOrganisation)) {
        companyName = actor.companyName;
      } else {
        const company = await this.userService.getUserById(currentOrganisation);
        companyName = company.companyName;
      }
      body.companyName = companyName;
      // await this.userService.addUser(body);

      return await this.storeTemporaryRegistration(
        email,
        body,
        companyName,
        true,
      );
    } catch (e) {
      return Promise.reject(e);
    }
  }

  // async verifyOtherUsers(body: AddUserDTO) {
  //   try {
  //     const { email, phoneNumber } = body;
  //     const queryArray: Record<string, string>[] = [];
  //     if (email) {
  //       queryArray.push({ email });
  //     }
  //     if (phoneNumber) {
  //       queryArray.push({ phoneNumber });
  //     }

  //     await this.userService.checkUserUniqueness(queryArray, true);
  //     const currentOrganisation =
  //       body.currentOrganisation || actor.currentOrganisation;
  //     if (!currentOrganisation) {
  //       return Promise.reject({
  //         ...responseHash.badPayload,
  //         message: "The user data must have a currentOrganisation property",
  //       });
  //     }
  //     const isValidRole = await this.permissionService.getRole(
  //       {
  //         _id: new Types.ObjectId(body.role),
  //         organisationId: new Types.ObjectId(currentOrganisation),
  //       },
  //       true
  //     );
  //     const organisations = body.organisations
  //       ? [body.currentOrganisation]
  //       : [actor.currentOrganisation];

  //     body.accountStatus = "active";
  //     body.needsToChangePassword = false;
  //     body.organisations = organisations;
  //     body.currentOrganisation = currentOrganisation;
  //     body.role = isValidRole._id;
  //     let companyName = "";
  //     if (Object.is(actor._id, currentOrganisation)) {
  //       companyName = actor.companyName;
  //     } else {
  //       const company = await this.userService.getUserById(currentOrganisation);
  //       companyName = company.companyName;
  //     }
  //     await this.userService.addUser(body);
  //   } catch (e) {
  //     return Promise.reject(e);
  //   }
  // }

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
      body.isVerified = true;
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
      await this.addUserToOrganisation(body, user);
      const token = await this.generateAuthToken(user);
      return await this.loginResponseTransformer(
        token,
        await this.userService.getUserById(user._id),
      );
    } catch (e) {
      return Promise.reject(e);
    }
  }

  async addUserToOrganisation(body: any, user: User) {
    try {
      let userDataToUpdate: Partial<User> = {};
      if (body.userType !== "vendor") {
        body.currentOrganisation = new Types.ObjectId(body.currentOrganisation);
        userDataToUpdate = {
          currentOrganisation: body.currentOrganisation,
          organisations: [body.currentOrganisation],
          role: new Types.ObjectId(body.role),
          accountStatus: "active",
        };
      }
      if (body.userType === "vendor") {
        const getVendorRole = await this.permissionService.getRole(
          { title: "vendor", tag: "global" },
          true,
        );
        userDataToUpdate = {
          ...userDataToUpdate,
          role: getVendorRole._id,
          needsToChangePassword: true,
        };
      }
      if (body.isVerified) {
        userDataToUpdate = {
          ...userDataToUpdate,
          accountStatus: "active",
          needsToChangePassword: false,
        };
      }
      await this.userService.updateUser(userDataToUpdate, user._id);
    } catch (e) {
      return Promise.reject(e);
    }
  }

  async handleForgotPassword(body: ForgotPasswordDTO) {
    try {
      let { email } = body;
      email = email.trim().replace(/\s+/g, "");
      const user = await this.userService.getUser({ email });
      if (!user) {
        return Promise.reject({
          ...responseHash.notFound,
          message: "Sorry,try again",
        });
      }
      const token = appConfig.isLive ? otpGenerator.generate(6) : "123456";
      await this.redisService.setEx(
        `verify:reset:password:${email}:${token}`,
        JSON.stringify({ email, token }),
        this.otpDuration,
      );
      return {
        message: `A  reset code  has been sent to ${email}`,
        otpEmail: email,
        expirationTime: this.otpDuration,
        durationType: "seconds",
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
          message: "Token has expired",
        });
      }
      const user = await this.userService.getUser({ email: cachedEmail });
      await Promise.all([
        this.userService.updateUser({ password }, user._id, user),
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
          message: "A user with the verification email does not exists",
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
