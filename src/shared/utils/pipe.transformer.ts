import { responseHash } from '@/constants';
import { BadRequestException } from '@nestjs/common';

export const pipeTransformer = <T>(value: T, schema: any) => {
  const result = schema.validate(value);
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
};
