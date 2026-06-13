import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventsService } from './events.service';
import { EventsController } from './events.controller';
import { Event, VenueSection, Seat, Ticket } from '../database/entities';

@Module({
  imports: [TypeOrmModule.forFeature([Event, VenueSection, Seat, Ticket])],
  controllers: [EventsController],
  providers: [EventsService],
  exports: [EventsService],
})
export class EventsModule {}
