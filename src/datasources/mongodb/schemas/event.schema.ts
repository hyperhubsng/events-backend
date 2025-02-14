import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, HydratedDocument, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Event extends Document {
  @Prop({ type: Types.ObjectId, ref: 'users' })
  ownerId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'users' })
  createdBy: Types.ObjectId;

  @Prop()
  description: string;

  @Prop()
  category: string;

  @Prop()
  title: string;

  @Prop()
  venue: string;

  @Prop({
    default : "https://images.com/fake-image.jpeg"
  })
  bannerUrl: string;

  @Prop()
  smallBannerUrl: string;

  @Prop()
  comment: string;

  @Prop()
  commentTitle: string;

  @Prop({
    enum: ['pending', 'ongoing' , 'completed' , 'deleted' , 'rejected' , 'cancelled'],
    default: 'pending',
  })
  status: string;

  @Prop()
  startDate: Date;

  @Prop()
  endDate: Date; 

  @Prop({
    default :500
  })
  availableSlots: number;

  @Prop({
    type: {
      type: String, 
      enum: ['Point'], 
      default: 'Point'
    },
    coordinates: {
      type: [Number]
    }
  })
  location: { type: string; coordinates: [Number] };

  @Prop({
    default : 0
  })
  cost: number;
}

export type EventDocument = HydratedDocument<Event>;
export const EventSchema = SchemaFactory.createForClass(Event);

EventSchema.index({location : "2dsphere"})