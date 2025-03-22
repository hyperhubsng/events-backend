import { appConfig } from "@/config";
import { HttpStatus } from "@nestjs/common";

export const REPOSITORY = "REPOSITORY";
export const DATA_SOURCE = "DATA_SOURCE";
export const PRODUCTION = "PRODUCTION";
export const REDIS_SOURCE = "REDIS_SOURCE";
export const PUBLIC_ROUTE = "Public_ROUTE";

export const responseHash = {
  success: {
    message: `Request successful`,
    code: "MELO00000",
    status: HttpStatus.OK,
  },
  internalServerError: {
    message: `Oops,something went wrong`,
    code: "MELO00100",
    status: HttpStatus.INTERNAL_SERVER_ERROR,
  },
  notFound: {
    message: "Not Found",
    code: "MELO00107",
    status: HttpStatus.NOT_FOUND,
  },
  badPayload: {
    message: "Bad request",
    code: "MELO00108",
    status: HttpStatus.BAD_REQUEST,
  },
  invalidOTP: {
    message: "Invalid OTP provided",
    code: "MELO00109",
    status: HttpStatus.BAD_REQUEST,
  },
  invalidAccessToken: {
    message: "Invalid Access Token",
    code: "MELO00110",
    status: HttpStatus.UNAUTHORIZED,
  },
  pageNotFound: {
    message: "Request path does not exist",
    code: "MELO00111",
    status: HttpStatus.NOT_FOUND,
  },
  invalidCredentials: {
    message: "Sorry, your credentials are not correct",
    code: "MELO00112",
    status: HttpStatus.UNAUTHORIZED,
  },
  duplicateExists: {
    message: "Sorry, the data you provided already exists",
    code: "MELO00112",
    status: HttpStatus.UNAUTHORIZED,
  },
  userNotFound: {
    message: "Oops, this user does not exist",
    code: "MELO00113",
    status: HttpStatus.UNAUTHORIZED,
  },
  forbiddenAction: {
    message: "Forbidden action",
    code: "MELO00114",
    status: HttpStatus.FORBIDDEN,
  },
};

export const getTempUserKey = (identifier: string) =>
  `${appConfig.tempUserKeyPrefix}${identifier}`;

export const PAYMENT_PROCESSORS = {
  paystack: "paystack",
  flutterWave: "flutterWave",
};

export const TICKET_PURCHASE_MESSAGE = (data: Record<string, any>) => {
  return `
  <main>
    <h1>Ticket Purchase Success</h1>
    <p>Hello ${data.firstName} ${data.lastName} , 
    your ticket purchase for ${data.eventTitle} was successful
    </p>
    <p> Purchase Summary : </p>
    <p> Quantity : ${data.ticketQuantity} </p>
    <p> Total Amount : ${data.ticketAmount} </p>
    <p> On the day of the event, provide thhis receipt for scanning</p>
    <img src=${data.src} alt='otp image'/>
    <p>Or give them your pass code : ${data.passCode} </p>
    <p>We look forward to seeing you. Cheers!</p>
  </main>
  `;
};
