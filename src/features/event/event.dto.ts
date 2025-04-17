import { ICharges, ITicket } from "@/shared/interface/interface";
import { Types } from "mongoose";

export class AddEventDTO {
  ownerId: Types.ObjectId;
  createdBy: Types.ObjectId;
  description: string;
  category: string;
  title: string;
  venue: string;
  startDate: Date;
  endDate: Date;
  availableSlot: number;
  coordinates: number[];
  location: any;
  eventType: string;
  images: string[];
  tickets?: ITicket[];
  slug: string;
  status: string;
}

export class HttpQueryDTO {
  q: string;
  distance: number;
  lat: number;
  long: number;
  country: string;
  cost: number;
  status: string;
  owner: Types.ObjectId;
}

export class CreateTicketDTO {
  ownerId: Types.ObjectId;
  eventId: Types.ObjectId;
  description: string;
  price: number;
  title: string;
  hasDiscount: boolean;
  discountType: string;
  discountValue: number;
  quantity: number;
  available: number;
  quantityAvailable: number;
  booked: number;
  email: string;
  orderLimit: number;
}

export class PurchaseTicketDTO {
  firstName: string;
  lastName: string;
  phoneNumber: string;
  email: string;
  tickets: ITicket[];
  charges: ICharges[];
  callbackUrl: string;
  paymentProcessor: string;
  discountCode: string;
}
