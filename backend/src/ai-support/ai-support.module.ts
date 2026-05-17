import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Event } from '../database/entities';
import { AiSupportService } from './ai-support.service';
import { AiSupportController } from './ai-support.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Event])],
  providers: [AiSupportService],
  controllers: [AiSupportController],
  exports: [AiSupportService],
})
export class AiSupportModule {}
