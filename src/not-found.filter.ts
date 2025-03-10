import {
  ExceptionFilter,
  Catch,
  NotFoundException,
  ArgumentsHost,
} from "@nestjs/common";
import { Response } from "express";
import { responseHash } from "@/constants";

@Catch(NotFoundException)
export class NotFoundFilter implements ExceptionFilter {
  catch(_: NotFoundException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const responsePayload = responseHash.pageNotFound;
    response.status(404).json({
      status: "failed",
      ...(responsePayload && { message: responsePayload.message }),
      ...(responsePayload && { code: responsePayload.code }),
    });
  }
}
