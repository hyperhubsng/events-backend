import { IDiscountEntity } from "@/shared/interface/interface";
import { Types } from "mongoose";

export class DiscountDTO {
  targets: IDiscountEntity[];
  ownerId: Types.ObjectId;
  code: string;
  hasExpiration: boolean;
  hasMaxCap: boolean;
  maxCap: number;
  hasUsageLimit: boolean;
  usageLimit: number;
  discountType: string;
  value: number;
  quantity: number;
  startDate: Date;
  endDate: Date;
  quantityUsed: number;
  quantityRemaining: number;
}
