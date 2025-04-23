import { pipeTransformer } from "@/shared/utils/pipe.transformer";
import {
  ArgumentMetadata,
  BadRequestException,
  Injectable,
  PipeTransform,
} from "@nestjs/common";
import {
  AddEventDTO,
  CreateTicketDTO,
  HttpQueryDTO,
  PurchaseTicketDTO,
  RemoveEventImagesDTO,
} from "./event.dto";
import {
  addEventSchema,
  createTicketSchema,
  eventListSchema,
  purchaseTicketSchema,
  removeEventImageSchema,
  updateEventSchema,
  updateTicketSchema,
} from "@/shared/joi-schema";
import { responseHash } from "@/constants";

export class AddEventPipe implements PipeTransform {
  transform(value: AddEventDTO) {
    return pipeTransformer<AddEventDTO>(value, addEventSchema);
  }
}

Injectable();
export class EventQueryPipe implements PipeTransform {
  transform(value: HttpQueryDTO, metadata: ArgumentMetadata) {
    if (metadata.type === "query") {
      const result = eventListSchema.validate(value);
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

export class CreateTicketPipe implements PipeTransform {
  transform(value: CreateTicketDTO) {
    return pipeTransformer<CreateTicketDTO>(value, createTicketSchema);
  }
}

export class PurchaseTicketPipe implements PipeTransform {
  transform(value: PurchaseTicketDTO) {
    return pipeTransformer<PurchaseTicketDTO>(value, purchaseTicketSchema);
  }
}

export class UpdateEventPipe implements PipeTransform {
  transform(value: AddEventDTO) {
    return pipeTransformer<AddEventDTO>(value, updateEventSchema);
  }
}

export class UpdateTicketPipe implements PipeTransform {
  transform(value: CreateTicketDTO) {
    return pipeTransformer<CreateTicketDTO>(value, updateTicketSchema);
  }
}

export class RemoveEventImagesPipe implements PipeTransform {
  transform(value: RemoveEventImagesDTO) {
    return pipeTransformer<RemoveEventImagesDTO>(value, removeEventImageSchema);
  }
}
