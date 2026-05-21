import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SocialMatchController } from './social-match.controller';
import { SocialMatchService } from './social-match.service';
import { Event, SocialMatchConnection, SocialMatchPreference, Ticket, User } from '../database/entities';

@Module({
  imports: [TypeOrmModule.forFeature([SocialMatchPreference, SocialMatchConnection, Ticket, Event, User])],
  controllers: [SocialMatchController],
  providers: [SocialMatchService],
})
export class SocialMatchModule {}
