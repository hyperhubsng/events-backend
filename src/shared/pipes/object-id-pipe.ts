import { responseHash } from "@/constants";
import { PipeTransform, Injectable, BadRequestException } from "@nestjs/common";
import { ObjectId } from "mongodb";

@Injectable()
export class ObjectIdValidationPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    if (!ObjectId.isValid(value)) {
      throw new BadRequestException({
        ...responseHash.badPayload,
        message: "Invalid id",
      });
    }
    return value;
  }
}
