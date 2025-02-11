// import { SuccessResponse } from '@/shared/response/success-response';
// import { Body, Controller, Get, Post, Req, Res } from '@nestjs/common';
// import { Request, Response } from 'express';
// import { MemberService } from './member.service';
// import { UserDecorator } from '../user/user.decorator';
// import { User } from '@/datasources/mongodb/schemas/user.schema';
// import { OnboardMemberPipe } from './member.pipe';
// import { AddUserDTO } from '../user/user.dto';
// import { PUBLIC } from '../auth/public.decorator';

// @Controller('members')
// export class MemberController {
//   constructor(
//     private readonly succcessResponse: SuccessResponse,
//     private readonly memberService: MemberService,
//   ) {}

//   @Post()
//   async onboardMember(
//     @Req() req: Request,
//     @Res() res: Response,
//     @Body(new OnboardMemberPipe()) body: AddUserDTO,
//     @UserDecorator() user: User,
//   ) {
//     const data = await this.memberService.onboardMember(body, user);
//     await this.succcessResponse.ok(res, req, { data });
//   }

//   @Get()
//   async fetchMembers(
//     @Req() req: Request,
//     @Res() res: Response,
//     @UserDecorator() user: User,
//   ) {
//     const { data, extraData } = await this.memberService.listCommunityMembers(
//       req,
//       user,
//     );
//     await this.succcessResponse.ok(res, req, { data, pagination: extraData });
//   }
// }
