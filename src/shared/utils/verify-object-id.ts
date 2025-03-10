import { responseHash } from "@/constants";
import { BadRequestException } from "@nestjs/common";
import { ObjectId } from "mongodb";

export const verifyObjectId = (value: string) => {
  if (!ObjectId.isValid(value)) {
    throw new BadRequestException({
      ...responseHash.badPayload,
      message: "Invalid id",
    });
  }
  return value;
};
