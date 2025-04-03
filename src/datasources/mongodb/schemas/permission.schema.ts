import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, HydratedDocument } from "mongoose";

@Schema({ timestamps: true })
export class Permission extends Document {
  @Prop()
  title: string;

  @Prop({
    enum: ["events", "tickets", "payments", "attendees", "users", "discounts"],
  })
  resource: string;
}

export type PermissionDocument = HydratedDocument<Permission>;
export const PermissionSchema = SchemaFactory.createForClass(Permission);
