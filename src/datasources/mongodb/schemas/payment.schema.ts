import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, HydratedDocument, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Payment extends Document {
  @Prop()
  userId: Types.ObjectId;

  @Prop()
  userIdentifier: string;

  @Prop()
  productId: Types.ObjectId;

  @Prop()
  productTitle: string;

  @Prop({
    enum: ['community', 'platform', 'user', 'member', 'govt'],
    default: 'community',
  })
  beneficiary: string;

  @Prop()
  beneficiaryId: Types.ObjectId;

  @Prop({ default: false })
  cleared: boolean;

  @Prop()
  paymentDate: Date;
  @Prop()
  paymentReference: string;

  @Prop()
  amount: number;

  @Prop()
  balanceBefore: number;

  @Prop()
  balanceAfter: number;

  @Prop()
  narration: string;

  @Prop({
    enum: ['pending', 'completed'],
  })
  status: string;

  @Prop({
    enum: ['debit', 'credit'],
  })
  paymentType: string;

  @Prop({
    enum: ['paystack', 'monnify', 'flutterwave'],
  })
  processor: string;

  @Prop({
    enum: ['reversal', 'withdrawal', 'topup', 'servicePayment'],
    default: 'servicePayment',
  })
  transactionKind: string;
}

export type PaymentDocument = HydratedDocument<Payment>;
export const PaymentSchema = SchemaFactory.createForClass(Payment);
