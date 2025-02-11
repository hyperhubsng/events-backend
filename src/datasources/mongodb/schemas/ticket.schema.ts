import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, HydratedDocument, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Ticket extends Document {
  @Prop({ type: Types.ObjectId, ref: 'events' })
  eventId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'users' })
  ownerId: Types.ObjectId;

  @Prop()
  title: string;

  @Prop({
    default: true,
  })
  isAvailable: boolean;

  @Prop({
    default: false,
  })
  hasDiscount: boolean;

  @Prop()
  amount: number;

  @Prop()
  discountAmount: number;

  @Prop({
    default: 500,
  })
  quanity: number;

  @Prop()
  comment: string;

  @Prop()
  email: string;

  @Prop({
    default: 0,
  })
  bookedSlots: number;

  @Prop({
    default: 0,
  })
  availableSlots: number;
}

export type TicketDocument = HydratedDocument<Ticket>;
export const TicketSchema = SchemaFactory.createForClass(Ticket);
