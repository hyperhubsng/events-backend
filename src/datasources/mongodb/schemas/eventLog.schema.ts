import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { object } from "joi";
import { Document, HydratedDocument, Types } from "mongoose";

@Schema({ timestamps: true })
export class EventLog extends Document {
  @Prop({
    enum: ["ticket", "event"],
  })
  category: string;

  @Prop({
    enum: ["checkin", "checkout"],
  })
  title: string;

  @Prop()
  description: string;

  @Prop({
    ref: "users",
    type: Types.ObjectId,
  })
  actor: Types.ObjectId;

  @Prop()
  eventId: Types.ObjectId;

  @Prop()
  ticketId: Types.ObjectId;

  @Prop({ type: object })
  meta: Record<string, any>;
}

export type EventLogDocument = HydratedDocument<EventLog>;
export const EventtLogSchema = SchemaFactory.createForClass(EventLog);
