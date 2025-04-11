import { Body, Controller, Post, Req, Res, UseGuards } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { ILoginData } from "@/shared/interface/interface";
import { SuccessResponse } from "@/shared/response/success-response";
import { Request, Response } from "express";
import {
  AuthLoginPipe,
  ForgotPasswordPipe,
  SetPasswordPipe,
  SignupPipe,
  VerificationPipe,
} from "./auth.pipe";
import {
  AuthVerifyAccountDTO,
  ForgotPasswordDTO,
  SetPasswordDTO,
} from "./auth.dto";
import { PUBLIC } from "./public.decorator";
import { AddUserDTO } from "../user/user.dto";
import { AdminGuard } from "./admin.guard";
import { UserDecorator } from "../user/user.decorator";
import { User } from "@/datasources/mongodb/schemas/user.schema";

@Controller("auth")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly successResponse: SuccessResponse,
  ) {}

  @PUBLIC()
  @Post("/login")
  async handleLogin(
    @Req() req: Request,
    @Res() res: Response,
    @Body(new AuthLoginPipe()) body: ILoginData,
  ) {
    const response = await this.authService.authenticateLogin(body);
    return this.successResponse.ok(res, req, { data: response });
  }

  @PUBLIC()
  @Post("/signup")
  async signup(
    @Req() req: Request,
    @Res() res: Response,
    @Body(new SignupPipe()) body: AddUserDTO,
  ) {
    const response = await this.authService.onboardUser(body);
    return this.successResponse.ok(res, req, { data: response });
  }

  @UseGuards(AdminGuard)
  @Post("/onboard-organiser")
  async onboardOrganiser(
    @Req() req: Request,
    @Res() res: Response,
    @Body(new SignupPipe()) body: AddUserDTO,
  ) {
    const response = await this.authService.onboardOrganiser(body);
    return this.successResponse.ok(res, req, { data: response });
  }

  @Post("/onboard-secondary-users")
  async addOtherUsers(
    @Req() req: Request,
    @Res() res: Response,
    @Body(new SignupPipe()) body: AddUserDTO,
    @UserDecorator() user: User,
  ) {
    const response = await this.authService.addOtherUsers(body, user);
    return this.successResponse.ok(res, req, { data: response });
  }

  @PUBLIC()
  @Post("/verify-signup")
  async verifySignup(
    @Req() req: Request,
    @Res() res: Response,
    @Body(new VerificationPipe()) body: AuthVerifyAccountDTO,
  ) {
    const response = await this.authService.verifyUserRegistration(body);
    return this.successResponse.ok(res, req, { data: response });
  }

  @PUBLIC()
  @Post("/forgot-password")
  async forgotPassword(
    @Req() req: Request,
    @Body(new ForgotPasswordPipe()) body: ForgotPasswordDTO,
    @Res() res: Response,
  ) {
    const data = await this.authService.handleForgotPassword(body);
    return this.successResponse.ok(res, req, { data });
  }

  @PUBLIC()
  @Post("/verify-forgot-password")
  async verifyResetPassword(
    @Req() req: Request,
    @Res() res: Response,
    @Body(new VerificationPipe()) body: AuthVerifyAccountDTO,
  ) {
    const data = await this.authService.verifyResetPassword(body);
    return this.successResponse.ok(res, req, { data });
  }

  @PUBLIC()
  @Post("/set-password")
  async setPassword(
    @Req() req: Request,
    @Res() res: Response,
    @Body(new SetPasswordPipe()) body: SetPasswordDTO,
  ) {
    await this.authService.setNewPassword(body);
    return this.successResponse.ok(res, req, { data: {} });
  }
}
