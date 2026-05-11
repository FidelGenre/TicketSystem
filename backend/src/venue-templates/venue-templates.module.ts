import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VenueTemplate } from '../database/entities/venue-template.entity';
import { VenueTemplatesService } from './venue-templates.service';
import { VenueTemplatesController } from './venue-templates.controller';

@Module({
  imports: [TypeOrmModule.forFeature([VenueTemplate])],
  controllers: [VenueTemplatesController],
  providers: [VenueTemplatesService],
  exports: [VenueTemplatesService],
})
export class VenueTemplatesModule {}
