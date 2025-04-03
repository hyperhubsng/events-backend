import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, HydratedDocument, Types } from "mongoose";

@Schema({ timestamps: true })
export class Role extends Document {
  @Prop()
  title: string;
  @Prop()
  permissions: string[];

  @Prop()
  userId: Types.ObjectId;

  @Prop()
  description: string;
}

export type RoleDocument = HydratedDocument<Role>;
export const RoleSchema = SchemaFactory.createForClass(Role);
