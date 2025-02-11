// import { SuccessResponse } from '@/shared/response/success-response';
// import {
//   Body,
//   Controller,
//   Get,
//   Param,
//   Post,
//   Put,
//   Req,
//   Res,
// } from '@nestjs/common';
// import { Request, Response } from 'express';
// import { UserDecorator } from '../user/user.decorator';
// import { User } from '@/datasources/mongodb/schemas/user.schema';
// import { AddUserDTO } from '../user/user.dto';
// import { PUBLIC } from '../auth/public.decorator';
// import { CommunityService } from './community.service';
// import { ObjectIdValidationPipe } from '@/shared/pipes/object-id-pipe';
// import { Types } from 'mongoose';

// @Controller('communities')
// export class CommunityController {
//   constructor(
//     private readonly successResponse: SuccessResponse,
//     private readonly communityService: CommunityService,
//   ) {}

//   @Get()
//   async listCommunities(
//     @Req() req: Request,
//     @Res() res: Response,
//     @UserDecorator() user: User,
//   ) {
//     const { data, extraData } = await this.communityService.listCommunity(
//       req,
//       user,
//     );
//     await this.successResponse.ok(res, req, { data, pagination: extraData });
//   }

//   @Get(':id')
//   async getCommunityInfo(
//     @Req() req: Request,
//     @Res() res: Response,
//     @Param('id', ObjectIdValidationPipe) id: string,
//   ) {
//     const data = await this.communityService.getOneCommunity({
//       _id: new Types.ObjectId(id),
//     });
//     await this.successResponse.ok(res, req, { data });
//   }

//   @Put(':id/join')
//   async joinCommunity(
//     @Req() req: Request,
//     @Res() res: Response,
//     @Param('id', ObjectIdValidationPipe) id: string,
//     @UserDecorator() user: User,
//   ) {
//     const data = await this.communityService.joinCommunity(id, user);
//     await this.successResponse.ok(res, req, { data });
//   }
// }
