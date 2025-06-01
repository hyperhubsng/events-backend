import { Role } from "@/datasources/mongodb/schemas/role.schema";
import { Types } from "mongoose";

export interface ILoginData {
  email: string;
  password: string;
}

export interface IPagination {
  currentPage: number;
  perPage: number;
  prevPage: number | null;
  nextPage: number | null;
  total: number;
  totalPages: number;
  offset: number;
}

export interface IResponseInterface {
  status?: string;
  data: Record<string, any> | any;
  cache?: Record<string, any>;
  pagination?: IPagination;
}

export interface IUserJwtPayload {
  email: string;
  user: Types.ObjectId;
  lastName: string;
  firstName: string;
  audience: string;
  issuer: string;
  subject: string;
  sub: Types.ObjectId;
  userId: Types.ObjectId;
  communtityManaged: Types.ObjectId;
}

export interface ILoginResponse {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  token: string;
  profileImageUrl: string | null;
  userType: string;
  currentOrganisation?: Types.ObjectId;
  organisations?: Types.ObjectId[];
  role: Partial<Role>;
}

export interface IHttpQueryParser {
  skip: number;
  filters: string[];
  populate: string[];
  from: string;
  to: string;
  page: number;
  docLimit: number;
  dbQueryParam: Record<string, any>;
  sort: string;
}

export interface ITransactionData {
  user: Types.ObjectId | string;
  paymentReference: string;
  transactionId?: string;
  paymentMethod: string;
  narration: string;
  status: string;
  currency: string;
  amount: number;
  processor: string;
  transactionDate: Date;
  transactionType: string;
  userIdentifier: string;
  originalAmount?: number;
  productTitle: string;
  productId: string | Types.ObjectId;
  beneficiaryId: string | Types.ObjectId;
  firstName?: string;
  lastName?: string;
  callbackUrl?: string;
}

export interface IPaymentHeaders {
  Authorization: string;
  "Content-Type": string;
}

export interface IPaymentData {
  userId?: Types.ObjectId;
  productId: Types.ObjectId;
  productTitle: string;
  paymentType: string;
  paymentReference: string;
  paymentDate: Date;
  narration: string;
  processor: string;
  userIdentifier: string;
  tickets: ITicket[];
  charges: ICharges[];
  amount?: number;
  hasDiscount: boolean;
  discountAmount: number;
  discountCode: string;
}
export interface IDiscountData {
  discountCode: string;
  discountAmount: number;
  quantity: number;
}
export interface IPaymentConfirmationEvent {
  paymentReference: string;
  paymentLogData: {
    hasBeenProcessed: boolean;
    providerResponse: string;
    status: string;
  };
  attendeeData: IAttendee;
  paymentData: IPaymentData;
  discountData: IDiscountData;
}

export interface ISocialLink {
  name: string;
  url: string;
}

export interface IUser {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  nickName: string;
  phoneNumber: string;
}

export interface ICommunity {
  description: string;
  isPublic: boolean;
  socialLinks: [ISocialLink];
  managerId: Types.ObjectId;
}

export interface ITemporaryUserResponse {
  message: string;
  otpEmail: string;
  expirationTime: number;
  durationType: string;
}

export interface ISuccess {
  customerName: string;
  done: boolean;
  results: Array<IFormData>;
}

export interface IFormData {
  name: string;
  value: any;
}

export interface IError {
  errors: any;
  status: string;
  message: string;
  responseMessage: string;
}

export interface ICommunityManagerJWT extends IUserJwtPayload {
  communtityManaged: Types.ObjectId;
}

export type JwtUnion = Partial<IUserJwtPayload & ICommunityManagerJWT>;

export type numStrObj = number | string | object;

export interface ITicket {
  ticketId: string;
  quantity: number;
  amount: number;
  title: string;
  eventId: Types.ObjectId;
  ownerId: Types.ObjectId;
  quantityAvailable: number;
  quantitySold: number;
  totalAmountSold: number;
  totalAmountReceived: number;
}

export interface ICharges {
  name: string;
  amount: number;
}

export interface IAttendee {
  firstName: string;
  transactionReference: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  tickets: ITicket[];
  passCode: string;
  hasDiscount: boolean;
  discountAmount: number;
  discountCode: string;
}

export interface AuthenticatedRequest extends Request {
  user?: Record<string, any>;
}

export interface IDiscountEntity {
  targetType: string;
  targetId: Types.ObjectId;
}

export interface IPurchaseFreeEvent {
  reference: string;
  firstName: string;
  lastName: string;
  email: string;
  displayName: string;
  phoneNumber: string;
  hasDiscount: boolean;
  discountCode: string;
  discountAmount: number;
  tickets: ITicket[];
  narration: string;
}

export interface IFreeEventAttendee extends IPurchaseFreeEvent {
  passcode: string;
}

export interface IEventSalesNotificationData {
  passCode: string;
  firstName: string;
  lastName: string;
  ticketAmount: number;
  ticketQuantity: number;
  eventTitle: string;
}
