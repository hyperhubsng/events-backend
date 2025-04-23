import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, HydratedDocument, Types } from "mongoose";

@Schema({ timestamps: true })
export class Ticket extends Document {
  @Prop({ type: Types.ObjectId, ref: "events" })
  eventId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "users" })
  ownerId: Types.ObjectId;

  @Prop({
    lowercase: true,
  })
  title: string;

  @Prop({
    default: true,
  })
  isAvailable: boolean;

  @Prop({
    default: false,
  })
  hasDiscount: boolean;

  @Prop({
    enum: ["flat", "percent"],
  })
  discountType: string;

  @Prop()
  discountValue: number;

  @Prop()
  hasCappedDiscount: boolean;

  @Prop()
  cappedDiscountAmount: number;

  @Prop()
  price: number;

  @Prop()
  discountAmount: number;

  @Prop({
    required: true,
  })
  quantity: number;

  @Prop()
  description: string;

  @Prop()
  email: string;

  @Prop()
  quantitySold: number;

  @Prop()
  quantityAvailable: number;

  @Prop()
  orderLimit: number;

  @Prop()
  totalAmountSold: number;

  @Prop()
  totalAmountReceived: number;

  @Prop({
    default: false,
  })
  softDelete: boolean;
}

export type TicketDocument = HydratedDocument<Ticket>;
export const TicketSchema = SchemaFactory.createForClass(Ticket);

TicketSchema.pre("findOneAndUpdate", async function (next) {
  try {
    const update = this.getUpdate();
    const filter = this.getQuery();
    const existingDoc = await this.model.findOne(filter).lean();
    if (update && typeof update === "object" && !Array.isArray(update)) {
      const updateQuery = update as Record<string, any>;
      if (updateQuery.hasOwnProperty("$inc")) {
        const newQuantityAvailable =
          existingDoc.quantity -
          existingDoc.quantitySold -
          updateQuery.$inc.quantitySold;
        updateQuery.$set.quantityAvailable = newQuantityAvailable;
        if (newQuantityAvailable === 0) {
          updateQuery.$set.isAvailable = false;
        }
        this.setUpdate(updateQuery);
      }
    }
    return next();
  } catch (error: any) {
    return next(error);
  }
});
