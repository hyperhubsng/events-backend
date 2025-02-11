import { Types } from 'mongoose';
export class AddMatchDTO {
  communityId: Types.ObjectId;
  matchDate: Date;
  status: string;
  isPaid: boolean;
  amount: number;
  slot: number;
  comment: string;
}
