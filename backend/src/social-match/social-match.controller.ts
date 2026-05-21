import { Body, Controller, Get, Param, Post, Put, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SocialMatchConnectionStatus, SocialMatchInterest } from '../database/entities';
import { SocialMatchService } from './social-match.service';

type UpdateSocialMatchDto = {
  isActive?: boolean;
  interests?: SocialMatchInterest[];
  industry?: string | null;
  instagram?: string | null;
  privateMode?: boolean;
  invisibleMode?: boolean;
  shareInstagram?: boolean;
  shareLocation?: boolean;
};

@UseGuards(AuthGuard('jwt'))
@Controller('social-match')
export class SocialMatchController {
  constructor(private readonly socialMatchService: SocialMatchService) {}

  @Get('me')
  getMySocialMatch(@Request() req: any) {
    return this.socialMatchService.getMySocialMatch(req.user.id);
  }

  @Get('events/:eventId/suggestions')
  getSuggestions(@Request() req: any, @Param('eventId') eventId: string) {
    return this.socialMatchService.getSuggestions(req.user.id, eventId);
  }

  @Post('connections')
  requestConnection(@Request() req: any, @Body() dto: { eventId: string; receiverId: string }) {
    return this.socialMatchService.requestConnection(req.user.id, dto.eventId, dto.receiverId);
  }

  @Put('connections/:connectionId')
  updateConnection(
    @Request() req: any,
    @Param('connectionId') connectionId: string,
    @Body() dto: { status: SocialMatchConnectionStatus.ACCEPTED | SocialMatchConnectionStatus.DECLINED | SocialMatchConnectionStatus.CANCELLED },
  ) {
    return this.socialMatchService.updateConnection(req.user.id, connectionId, dto.status);
  }

  @Get('connections/:connectionId/messages')
  getMessages(@Request() req: any, @Param('connectionId') connectionId: string) {
    return this.socialMatchService.getMessages(req.user.id, connectionId);
  }

  @Post('connections/:connectionId/messages')
  sendMessage(
    @Request() req: any,
    @Param('connectionId') connectionId: string,
    @Body() dto: { message: string },
  ) {
    return this.socialMatchService.sendMessage(req.user.id, connectionId, dto.message);
  }

  @Put('events/:eventId/preferences')
  updatePreference(
    @Request() req: any,
    @Param('eventId') eventId: string,
    @Body() dto: UpdateSocialMatchDto,
  ) {
    return this.socialMatchService.updatePreference(req.user.id, eventId, dto);
  }
}
