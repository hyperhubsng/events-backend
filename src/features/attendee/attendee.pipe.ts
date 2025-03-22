import {
  ArgumentMetadata,
  BadRequestException,
  PipeTransform,
} from "@nestjs/common";
import { HttpQueryDTO } from "./attendee.dto";
import { attendeeQuerySchema } from "@/shared/joi-schema";
import { responseHash } from "@/constants";

export class AttendeeQueryPipe implements PipeTransform {
  transform(value: HttpQueryDTO, metadata: ArgumentMetadata) {
    if (metadata.type === "query") {
      const result = attendeeQuerySchema.validate(value);
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
