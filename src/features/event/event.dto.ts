import { Types } from "mongoose";

export class AddEventDTO {
    ownerId: Types.ObjectId;
    createdBy : Types.ObjectId;
    description: string;
    category: string;
    title: string;
    venue: string;
    startDate: Date;
    endDate: Date; 
    availableSlot: number;
    coordinates: number[];
    location : any
    eventType : string
}

export class HttpQueryDTO {
    q : string 
    distance : number 
    lat : number 
    long : number
    country  :string 
    cost : number 
}

export class CreateTicketDTO {
    ownerId: Types.ObjectId;
    eventId: Types.ObjectId;
    description: string;
    price  :number ; 
    title: string;
    hasDiscount : boolean ; 
    discountType : string ; 
    discountValue : number ; 
    quantity : number ; 
    available : number ; 
    booked : number ; 
    email : string;
    orderLimit : number
}