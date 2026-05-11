import { Controller, Get, Post, Body, Delete, Param, UseGuards } from '@nestjs/common';
import { VenueTemplatesService } from './venue-templates.service';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../database/entities/user.entity';

@Controller('venue-templates')
export class VenueTemplatesController {
  constructor(private readonly templatesService: VenueTemplatesService) {}

  @Get()
  findAll() {
    return this.templatesService.findAll();
  }

  @Post()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  create(@Body() data: any) {
    return this.templatesService.create(data);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  delete(@Param('id') id: string) {
    return this.templatesService.delete(id);
  }
}
