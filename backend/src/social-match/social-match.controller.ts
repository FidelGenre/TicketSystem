import { Body, Controller, Get, Param, Put, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SocialMatchService } from './social-match.service';

@Controller('social-match')
@UseGuards(AuthGuard('jwt'))
export class SocialMatchController {
  constructor(private readonly socialMatchService: SocialMatchService) {}

  @Get('me')
  getMyPreferences(@Request() req: any) {
    return this.socialMatchService.getMyPreferences(req.user.id);
  }

  @Get('events/:eventId/summary')
  getEventSummary(@Param('eventId') eventId: string, @Request() req: any) {
    return this.socialMatchService.getEventSummary(req.user.id, eventId);
  }

  @Put('events/:eventId/preferences')
  savePreference(
    @Param('eventId') eventId: string,
    @Body() body: any,
    @Request() req: any,
  ) {
    return this.socialMatchService.upsertPreference(req.user.id, eventId, body);
  }
}
