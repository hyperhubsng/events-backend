import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, HydratedDocument, Types } from "mongoose";

@Schema({ timestamps: true })
export class Role extends Document {
  @Prop({
    lowercase: true,
  })
  title: string;
  @Prop()
  permissions: string[];

  @Prop()
  userId: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: "users",
  })
  organisationId: Types.ObjectId;

  @Prop()
  description: string;
  @Prop({
    enum: ["global"],
  })
  tag: string;

  @Prop({
    default: false,
  })
  softDelete: boolean;
}

export type RoleDocument = HydratedDocument<Role>;
export const RoleSchema = SchemaFactory.createForClass(Role);
