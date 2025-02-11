import { ISocialLink } from '@/shared/interface/interface';
import { Types } from 'mongoose';

export class MemberDTO {
  communityId: Types.ObjectId;
  dateJoined: Date;
  userId: Types.ObjectId;
  designation: string;
  socialLinks: ISocialLink;
}

export class OnboardMemberDTO {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  nickName?: string;
}
