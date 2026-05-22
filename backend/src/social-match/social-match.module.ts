import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SocialMatchController } from './social-match.controller';
import { SocialMatchService } from './social-match.service';
import { Event, Order, SocialMatchConnection, SocialMatchMessage, SocialMatchPreference, Ticket, User } from '../database/entities';

@Module({
  imports: [TypeOrmModule.forFeature([SocialMatchPreference, SocialMatchConnection, SocialMatchMessage, Ticket, Event, User, Order])],
  controllers: [SocialMatchController],
  providers: [SocialMatchService],
})
export class SocialMatchModule {}
