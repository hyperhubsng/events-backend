import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, HydratedDocument, Types } from "mongoose";

@Schema({ timestamps: true })
export class Organisation extends Document {
  @Prop({
    trim: true,
    lowercase: true,
    index: true,
  })
  name: string;

  @Prop({
    default: "nigeria",
  })
  country: string;

  @Prop()
  profileImageUrl: string;

  @Prop()
  companyName: string;

  @Prop()
  website: string;

  @Prop({ type: Types.ObjectId, ref: "users" })
  owner: Types.ObjectId;
}

export const OrganisationSchema = SchemaFactory.createForClass(Organisation);
export type OrganisationDocument = HydratedDocument<Organisation>;
