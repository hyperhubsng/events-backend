import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { object } from "joi";
import { Document, HydratedDocument } from "mongoose";

@Schema({ timestamps: true })
export class PaymentLog extends Document {
  @Prop()
  paymentReference: string;

  @Prop()
  amount: number;

  @Prop({
    default: "pending",
  })
  status: string;
  @Prop({
    enum: ["paystack", "monnify", "flutterwave"],
  })
  processor: string;
  @Prop({ default: false })
  hasBeenProcessed: boolean;
  @Prop({
    default: "pending",
  })
  providerResponse: string;

  @Prop({ type: object })
  meta: Record<string, any>;
}

export type PaymentLogDocument = HydratedDocument<PaymentLog>;
export const PaymentLogSchema = SchemaFactory.createForClass(PaymentLog);
