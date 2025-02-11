import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, HydratedDocument, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Event extends Document {
  @Prop({ type: Types.ObjectId, ref: 'users' })
  ownerId: Types.ObjectId;

  @Prop()
  description: string;

  @Prop()
  category: string;

  @Prop()
  title: string;

  @Prop()
  venue: string;

  @Prop()
  bannerUrl: string;

  @Prop()
  smallBannerUrl: string;

  @Prop()
  comment: string;

  @Prop()
  commentTitle: string;

  @Prop({
    enum: ['pending', 'ongoing' , 'completed' , 'deleted'],
    default: 'active',
  })
  status: string;

  @Prop()
  startDate: Date;

  @Prop()
  endDate: Date; 

  @Prop({
    default :500
  })
  maxAttendees: number;

  @Prop({
    type : []
  })
  location: number[];
}

export type EventDocument = HydratedDocument<Event>;
export const EventSchema = SchemaFactory.createForClass(Event);
