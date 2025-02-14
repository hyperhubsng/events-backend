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
}

export class HttpQueryDTO {
    q : string 
    distance : number 
    lat : number 
    long : number
    country  :string 
    cost : number 
}