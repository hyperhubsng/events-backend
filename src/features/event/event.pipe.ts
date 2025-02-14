import { pipeTransformer } from '@/shared/utils/pipe.transformer';
import { ArgumentMetadata, BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { AddEventDTO, HttpQueryDTO } from './event.dto';
import { addEventSchema, eventListSchema } from '@/shared/joi-schema';
import { responseHash } from '@/constants';
export class AddEventPipe implements PipeTransform {
  transform(value: AddEventDTO) {
    return pipeTransformer<AddEventDTO>(value, addEventSchema);
  }
}

Injectable();
export class EventQueryPipe implements PipeTransform {
  transform(value: HttpQueryDTO, metadata: ArgumentMetadata) {
    if (metadata.type === 'query') {
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