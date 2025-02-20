import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, HydratedDocument, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Ticket extends Document {
  @Prop({ type: Types.ObjectId, ref: 'events' })
  eventId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'users' })
  ownerId: Types.ObjectId;

  @Prop({
    lowercase: true
  })
  title: string;

  @Prop({
    default: true,
  })
  isAvailable: boolean;

  @Prop({
    default: false,
  })
  hasDiscount: boolean;

  @Prop({
    enum : ["flat" , "percent"]
  })
  discountType: string;

  @Prop()
  discountValue: number;

  @Prop()
  hasCappedDiscount: boolean;

  @Prop()
  cappedDiscountAmount: number;

  @Prop()
  price: number;

  @Prop()
  discountAmount: number;

  @Prop({
    required  :true
  })
  quantity: number;

  @Prop()
  description: string;

  @Prop()
  email: string;

  @Prop()
  quantitySold: number;

  @Prop()
  quantityAvailable: number;

  @Prop()
  orderLimit: number;

  @Prop()
  totalAmountSold: number;

  @Prop()
  totalAmountReceived: number;
}

export type TicketDocument = HydratedDocument<Ticket>;
export const TicketSchema = SchemaFactory.createForClass(Ticket);
