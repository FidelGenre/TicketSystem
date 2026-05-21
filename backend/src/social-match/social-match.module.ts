import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SocialMatchController } from './social-match.controller';
import { SocialMatchService } from './social-match.service';
import { SocialMatchPreference, Ticket } from '../database/entities';

@Module({
  imports: [TypeOrmModule.forFeature([SocialMatchPreference, Ticket])],
  controllers: [SocialMatchController],
  providers: [SocialMatchService],
})
export class SocialMatchModule {}
