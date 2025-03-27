import { pipeTransformer } from "@/shared/utils/pipe.transformer";
import { PipeTransform } from "@nestjs/common";
import {
  createDiscountSchema,
  updateDiscountSchema,
} from "@/shared/joi-schema";
import { DiscountDTO } from "./discount.dto";

export class CreateDiscountPipe implements PipeTransform {
  transform(value: DiscountDTO) {
    return pipeTransformer<DiscountDTO>(value, createDiscountSchema);
  }
}

export class UpdateDiscountPipe implements PipeTransform {
  transform(value: DiscountDTO) {
    return pipeTransformer<DiscountDTO>(value, updateDiscountSchema);
  }
}
