import { pipeTransformer } from '@/shared/utils/pipe.transformer';
import { PipeTransform } from '@nestjs/common';
import { AddMatchDTO } from './match.dto';
import { addMatchSchema } from '@/shared/joi-schema';

export class AddMatchPipe implements PipeTransform {
  transform(value: AddMatchDTO) {
    return pipeTransformer<AddMatchDTO>(value, addMatchSchema);
  }
}
