import {
  ArgumentMetadata,
  BadRequestException,
  PipeTransform,
} from "@nestjs/common";
import { UserQueryDTO } from "./user.dto";
import { userListSchema } from "@/shared/joi-schema";
import { responseHash } from "@/constants";

export class UserQueryPipe implements PipeTransform {
  transform(value: UserQueryDTO, metadata: ArgumentMetadata) {
    if (metadata.type === "query") {
      const result = userListSchema.validate(value);
      if (result.error) {
        const errorMessage = result.error.details
          .map((e: Error) => e.message)
          .join();
        throw new BadRequestException({
          ...responseHash.badPayload,
          message: errorMessage,
        });
      }
      return value;
    }
    return value;
  }
}
