import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, HydratedDocument } from 'mongoose';
import * as bcrypt from 'bcryptjs';

import { appConfig } from '@/config';
@Schema({ timestamps: true })
export class User extends Document {
  @Prop({
    trim: true,
    lowercase: true,
    unique: true,
  })
  email: string;

  @Prop({
    trim: true,
    lowercase: true,
    index: true,
  })
  firstName: string;

  @Prop({
    trim: true,
    lowercase: true,
    index: true,
  })
  lastName: string;

  @Prop()
  nickName: string;
  @Prop()
  phoneNumber: string;
  @Prop({
    default: 'nigeria',
  })
  country: string;

  @Prop()
  profileImageUrl: string;

  @Prop()
  companyName: string;

  @Prop()
  website: string;

  @Prop()
  password: string;

  @Prop({ 
    enum : ["admin" , "vendor"],
    default : "vendor"
  })
  userType: string;
}

export const UserSchema = SchemaFactory.createForClass(User);
export type UserDocument = HydratedDocument<User>;

UserSchema.pre('save', async function (next) {
  try {
    if (!this.isModified('password')) {
      return next();
    }
    const salt = await bcrypt.genSalt(appConfig.saltFactor);
    this.password = await bcrypt.hash(this.password, salt);
    return next();
  } catch (error: any) {
    return next(error);
  }
});

UserSchema.pre('findOneAndUpdate', async function (next) {
  try {
    const update = this.getUpdate();
    if (update && typeof update === 'object' && !Array.isArray(update)) {
      const updateQuery = update as Record<string, any>;
      if (updateQuery.password) {
        const salt = await bcrypt.genSalt(appConfig.saltFactor);
        updateQuery.password = await bcrypt.hash(updateQuery.password, salt);
        this.setUpdate(updateQuery);
      }
    }
    return next();
  } catch (error: any) {
    return next(error);
  }
});
