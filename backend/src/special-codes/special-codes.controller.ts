import { Body, Controller, Get, Param, Patch, Post, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { UserRole } from '../database/entities';
import { SpecialCodesService } from './special-codes.service';

@Controller('special-codes')
export class SpecialCodesController {
  constructor(private readonly specialCodesService: SpecialCodesService) {}

  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  getMyCodes(@Request() req: any) {
    return this.specialCodesService.getMyCodes(req.user.id);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get()
  getAllCodes() {
    return this.specialCodesService.getAllCodes();
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post()
  createCode(@Body() dto: { code: string; ownerUserId: string; eventId?: string | null; isActive?: boolean }) {
    return this.specialCodesService.createCode(dto);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(UserRole.ADMIN)
  @Patch(':id')
  updateCode(
    @Param('id') id: string,
    @Body() dto: { code?: string; ownerUserId?: string; eventId?: string | null; isActive?: boolean },
  ) {
    return this.specialCodesService.updateCode(id, dto);
  }
}
