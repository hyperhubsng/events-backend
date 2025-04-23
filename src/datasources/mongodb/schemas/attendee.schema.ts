import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, HydratedDocument, Types } from "mongoose";

@Schema({ timestamps: true })
export class Attendee extends Document {
  @Prop()
  ownerId: Types.ObjectId;

  @Prop()
  eventId: Types.ObjectId;

  @Prop()
  ticketId: Types.ObjectId;

  @Prop()
  email: string;

  @Prop()
  phoneNumber: string;

  @Prop()
  title: string;

  @Prop()
  firstName: string;

  @Prop()
  lastName: string;

  @Prop()
  reference: string;

  @Prop()
  unitPrice: number;

  @Prop()
  quantity: number;

  @Prop()
  actualAmount: number;

  @Prop()
  amountPaid: number;

  @Prop({
    default: 0,
  })
  discountValue: number;

  @Prop({
    default: false,
  })
  usedDiscount: boolean;

  @Prop({
    default: true,
  })
  isValid: boolean;

  @Prop()
  dateUsed: Date;

  @Prop({
    default: false,
  })
  isChecked: boolean;

  @Prop({
    default: 0,
  })
  ticketsChecked: number;

  @Prop()
  passCode: string;

  @Prop()
  discountCode: string;

  @Prop({
    default: false,
  })
  hasDiscount: boolean;

  @Prop({
    default: 0,
  })
  discountAmount: number;
}

export type AttendeeDocument = HydratedDocument<Attendee>;
export const AttendeeSchema = SchemaFactory.createForClass(Attendee);
