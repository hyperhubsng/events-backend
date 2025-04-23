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

  @Prop({
    unique: true,
  })
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
  endDate: Date;

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

  @Prop()
  maxCap: number;

  @Prop({
    default: false,
  })
  softDelete: boolean;
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

DiscountSchema.pre("findOneAndUpdate", async function (next) {
  try {
    const update = this.getUpdate();
    const filter = this.getQuery();
    const existingDoc = await this.model.findOne(filter).lean();
    if (update && typeof update === "object" && !Array.isArray(update)) {
      const updateQuery = update as Record<string, any>;
      if (updateQuery.hasOwnProperty("$inc")) {
        const newQuantityAvailable =
          existingDoc.quantity -
          existingDoc.quantityUsed -
          updateQuery.$inc.quantityUsed;
        updateQuery.$set.quantityRemaining = newQuantityAvailable;
        if (newQuantityAvailable === 0) {
          updateQuery.$set.status = false;
        }
        this.setUpdate(updateQuery);
      }
    }
    return next();
  } catch (error: any) {
    return next(error);
  }
});
