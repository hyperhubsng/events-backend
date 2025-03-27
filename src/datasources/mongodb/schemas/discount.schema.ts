import { IDiscountEntity } from "@/shared/interface/interface";
import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, HydratedDocument, Types } from "mongoose";

@Schema({ timestamps: true })
export class Discount extends Document {
  @Prop()
  ownerId: Types.ObjectId;

  @Prop()
  eventId: Types.ObjectId;

  @Prop()
  ticketId: Types.ObjectId;

  @Prop()
  code: string;

  @Prop({
    enum: ["flat", "percent"],
  })
  discountType: string;

  @Prop()
  targets: IDiscountEntity[];

  @Prop({
    default: false,
  })
  hasMaxCap: boolean;

  @Prop({
    default: false,
  })
  hasExpiration: boolean;

  @Prop()
  expirationDate: Date;

  @Prop()
  startDate: Date;

  @Prop({
    default: false,
  })
  hasUsageLimit: boolean;

  @Prop()
  usageLimit: number;

  @Prop()
  value: number;

  @Prop()
  quantity: number;

  @Prop({
    default: 0,
  })
  quantityUsed: number;

  @Prop({
    default: 0,
  })
  quantityRemaining: number; //Store the same value on create

  @Prop({
    default: true,
  })
  status: boolean;
}

export type DiscountDocument = HydratedDocument<Discount>;
export const DiscountSchema = SchemaFactory.createForClass(Discount);

DiscountSchema.pre("save", async function (next) {
  try {
    const quantity = this.quantity || 0;
    const quantityUsed = this.quantityUsed || 0;
    this.quantityRemaining = quantity - quantityUsed;
    return next();
  } catch (error: any) {
    return next(error);
  }
});
