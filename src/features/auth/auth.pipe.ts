import * as Joi from "joi";
import { PipeTransform } from "@nestjs/common";
import { validationMessages } from "@/shared/utils/validation-messages";
import { pipeTransformer } from "@/shared/utils/pipe.transformer";
import {
  signupSchema,
  verifyAccountSchema,
  forgotPasswordSchema,
  setPasswordSchema,
} from "@/shared/joi-schema";
import { AddUserDTO } from "../user/user.dto";
import {
  AuthLoginDTO,
  AuthSignupDTO,
  AuthVerifyAccountDTO,
  ForgotPasswordDTO,
  SetPasswordDTO,
} from "./auth.dto";
import * as joiDate from "@joi/date";

const joi = Joi.extend(joiDate);

export const loginSchema = joi
  .object({
    email: joi
      .string()
      .email({
        minDomainSegments: 2,
      })
      .required()
      .messages({
        "string.empty": validationMessages("email").empty,
        "any.required": validationMessages("email").required,
        "any.only": validationMessages("email").only,
      }),
    password: joi
      .string()
      .required()
      .messages({
        "string.empty": validationMessages("password").empty,
        "any.required": validationMessages("password").required,
        "any.only": validationMessages("password").only,
      }),
  })
  .options({ stripUnknown: true });

export class AuthLoginPipe implements PipeTransform {
  transform(value: AuthLoginDTO) {
    return pipeTransformer<AuthLoginDTO>(value, loginSchema);
  }
}

export class AuthSignupPipe implements PipeTransform {
  transform(value: AuthSignupDTO) {
    return pipeTransformer<AuthSignupDTO>(value, signupSchema);
  }
}

export class SignupPipe implements PipeTransform {
  transform(value: AddUserDTO) {
    return pipeTransformer<AddUserDTO>(value, signupSchema);
  }
}

export class VerificationPipe implements PipeTransform {
  transform(value: AuthVerifyAccountDTO) {
    return pipeTransformer<AuthVerifyAccountDTO>(value, verifyAccountSchema);
  }
}

export class ForgotPasswordPipe implements PipeTransform {
  transform(value: ForgotPasswordDTO) {
    return pipeTransformer<ForgotPasswordDTO>(value, forgotPasswordSchema);
  }
}

export class SetPasswordPipe implements PipeTransform {
  transform(value: SetPasswordDTO) {
    return pipeTransformer<SetPasswordDTO>(value, setPasswordSchema);
  }
}
