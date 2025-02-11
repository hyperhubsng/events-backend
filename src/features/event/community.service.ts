// import { MongoDataServices } from '@/datasources/mongodb/mongodb.service';
// import { Community } from '@/datasources/mongodb/schemas/event.schema';
// import { User } from '@/datasources/mongodb/schemas/user.schema';
// import { IPagination } from '@/shared/interface/interface';
// import HTTPQueryParser from '@/shared/utils/http-query-parser';
// import { ResponseExtraData } from '@/shared/utils/http-response-extra-data';
// import { Injectable } from '@nestjs/common';
// import { Request } from 'express';
// import { responseHash } from '@/constants';
// import { MemberService } from '../attendee/member.service';
// import { Types } from 'mongoose';
// import { UserService } from '../user/user.service';
// import { AuthService } from '../auth/auth.service';

// @Injectable()
// export class CommunityService {
//   constructor(
//     private readonly mongoService: MongoDataServices,
//     private readonly memberService: MemberService,
//     private readonly userService: UserService,
//   ) {}
//   async addCommunity(communityData: any) {
//     try {
//       return await this.mongoService.communities.create(communityData);
//     } catch (err) {
//       return Promise.reject(err);
//     }
//   }

//   async listCommunity(req: Request, user: User) {
//     try {
//       const { skip, docLimit } = HTTPQueryParser(req.query);
//       const query: Record<string, any> = {};

//       const members = await this.aggregateCommunityInfo(query, skip, docLimit);
//       const membersCount = await this.mongoService.members.count(query);
//       const extraData: IPagination = ResponseExtraData(
//         req,
//         members.length,
//         membersCount,
//       );

//       return {
//         status: 'success',
//         data: members,
//         extraData: extraData,
//       };
//     } catch (e) {
//       return Promise.reject(e);
//     }
//   }

//   async aggregateCommunityInfo(
//     query: any,
//     skip: number = 0,
//     limit: number = 1000,
//   ) {
//     try {
//       const result = await this.mongoService.communities.aggregateRecords([
//         {
//           $match: query,
//         },
//         {
//           $lookup: {
//             from: 'users',
//             let: {
//               userId: '$managerId',
//             },
//             pipeline: [
//               {
//                 $match: {
//                   $expr: {
//                     $eq: ['$_id', '$$userId'],
//                   },
//                 },
//               },
//               {
//                 $project: {
//                   firstName: 1,
//                   nickName: 1,
//                   email: 1,
//                   phoneNumber: 1,
//                 },
//               },
//             ],
//             as: 'managerData',
//           },
//         },
//         {
//           $unwind: '$managerData',
//         },
//         {
//           $lookup: {
//             from: 'users',
//             let: {
//               userId: '$userId',
//             },
//             pipeline: [
//               {
//                 $match: {
//                   $expr: {
//                     $eq: ['$_id', '$$userId'],
//                   },
//                 },
//               },
//               {
//                 $project: {
//                   firstName: 1,
//                   lastName: 1,
//                   nickName: 1,
//                   currentUserType: 1,
//                   profileImageUrl: {
//                     $cond: [
//                       {
//                         $gt: ['$profileImageUrl', null],
//                       },
//                       '$profileImageUrl',
//                       '',
//                     ],
//                   },
//                   role: {
//                     $cond: [
//                       {
//                         $gt: ['$designation', null],
//                       },
//                       '$designation',
//                       'utility player',
//                     ],
//                   },
//                   _id: 0,
//                 },
//               },
//             ],
//             as: 'member',
//           },
//         },
//         {
//           $skip: skip,
//         },
//         {
//           $limit: limit,
//         },
//         {
//           $sort: {
//             createdAt: -1,
//           },
//         },
//       ]);
//       return result;
//     } catch (err) {
//       return Promise.reject(err);
//     }
//   }

//   async getOneCommunity(query: Record<string, any>): Promise<Community> {
//     try {
//       const match = await this.aggregateCommunityInfo(query);
//       if (match.length === 0) {
//         return Promise.reject({
//           ...responseHash.notFound,
//           message: 'Community not found',
//         });
//       }
//       return match[0];
//     } catch (e) {
//       return Promise.reject(e);
//     }
//   }

//   async joinCommunity(communityId: string, user: User) {
//     try {
//       //Check to ensure that the community exists
//       const objectidifyId = new Types.ObjectId(communityId);

//       await this.getOneCommunity({ _id: objectidifyId });
//       //Check to ensure that the user is not already a member
//       await this.memberService.rejectExistingMember({
//         userId: user._id,
//         communityId: objectidifyId,
//       });
//       await this.memberService.addMember({
//         userId: user._id,
//         communityId: objectidifyId,
//       });

//       await this.mongoService.users.updateOne(
//         { _id: user._id },
//         {
//           $set: {
//             currentCommunity: objectidifyId,
//             locked: false,
//           },
//           $push: {
//             communities: objectidifyId,
//           },
//         },
//       );
//       return await this.userService.getUserById(user._id);
//     } catch (err) {
//       return Promise.reject(err);
//     }
//   }
// }
