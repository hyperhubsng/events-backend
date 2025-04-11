import "dotenv/config";
import * as path from "path";
import * as winston from "winston";
import * as fs from "fs";
import { S3Client } from "@aws-sdk/client-s3";
import { fromEnv } from "@aws-sdk/credential-providers";
import { SESClient } from "@aws-sdk/client-ses";

export const sesClient = new SESClient({
  region: process.env.AWS_REGION,
  credentials: fromEnv(),
});

export const s3Client = new S3Client({
  credentials: fromEnv(),
  region: process.env.AWS_REGION as string,
});

const folderName = path.join(__dirname, "../../app_log/");
if (!fs.existsSync(folderName)) {
  fs.mkdirSync(folderName);
}

const { combine, timestamp, prettyPrint } = winston.format;
const logFormat = (timestamp: any, prettyPrint: any) => {
  if (combine) {
    return combine(timestamp(), prettyPrint());
  } else {
    return null;
  }
};
export const logFile: {
  filename: string;
  level: string;
  format: any;
  dirname: string;
  maxFiles: string;
} = {
  dirname: folderName,
  filename: "%DATE%.log",
  maxFiles: "1d",
  level: "error",
  format: logFormat(timestamp, prettyPrint),
};

export const appConfig = {
  secret: process.env.SECRET as string,
  secureMode: !!process.env.SECURE_MODE,
  jwtAudience: process.env.JWT_AUDIENCE,
  jwtIssuer: process.env.JWT_ISSUER,
  smsOTPExpiration: 2,
  isProduction: process.env.NODE_ENV === "production",
  saltFactor: 10,
  realOTP: (process.env.REAL_OTP as string) || "0",
  isLive: process.env.REAL_OTP as string,
  devOTP: process.env.DEV_OTP,
  tempUserKeyPrefix: "temp:user:",
  otpDuration: Number(process.env.REAL_OTP_DURATION) || 120,
  paystack: {
    publicKey: process.env.PAYSTACK_PUBLIC_KEY as string,
    secretKey: process.env.PAYSTACK_SECRET_KEY as string,
    transactionURL: process.env.PAYSTACK_TRANSACTION_URL as string,
    callbackURL: process.env.PAYMENT_CALLBACK_URL as string,
    verificationURL: process.env.PAYSTACK_VERIFICATION_URL as string,
  },

  flutterWave: {
    publicKey: process.env.FLUTTERWAVE_PUBLIC_KEY as string,
    secretKey: process.env.FLUTTERWAVE_SECRET_KEY as string,
    paymentURL: process.env.FLUTTERWAVE_PAYMENT_URL as string,
    callbackURL: process.env.PAYMENT_CALLBACK_URL as string,
    transactionsURL: process.env.FLUTTERWAVE_TRANSACTIONS_URL as string,
  },
  serverPort: 3000,
  aws: {
    bucketName: process.env.AWS_BUCKET as string,
    region: process.env.AWS_REGION as string,
  },
  emailSender: process.env.DEFAULT_EMAIL_SENDER as string,
  ticketConfirmationURL: process.env.TICKET_CONFIRMATION_BASE_URL as string,
  secondaryUsersVerificationURL: process.env
    .SECONDARY_USERS_VERIFICATION_URL as string,
};

export const mongooseConfig: any = {
  connectionString: {
    organisation: process.env.MONGOLAB_URL + "?retryWrites=false",
  },
  organisation: {
    connectionName: "hyperhubs",
  },
};
