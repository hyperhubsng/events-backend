export class AuthLoginDTO {
  email: string;
  password: string;
}

export class AuthSignupDTO {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export class AuthVerifyAccountDTO {
  otp: string;
  otpEmail: string;
}

export class ForgotPasswordDTO {
  email: string;
}

export class SetPasswordDTO {
  password: string;
  resetToken: string;
}
