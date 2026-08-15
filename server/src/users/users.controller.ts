import { Controller, Get, Patch, Put, Post, Delete, Param, Body, UseGuards, Request, UnauthorizedException } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get(':id')
  async getProfile(@Param('id') id: string) {
    return this.usersService.getProfile(id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  async patchProfile(@Param('id') id: string, @Body() body: any, @Request() req: any) {
    if (req.user.userId !== id) {
      throw new UnauthorizedException('You can only update your own profile');
    }
    return this.usersService.updateProfile(id, body);
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id')
  async putProfile(@Param('id') id: string, @Body() body: any, @Request() req: any) {
    if (req.user.userId !== id) {
      throw new UnauthorizedException('You can only update your own profile');
    }
    return this.usersService.updateProfile(id, body);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':authorId/follow')
  async followUser(@Param('authorId') authorId: string, @Request() req: any) {
    const followerId = req.user.userId;
    return this.usersService.follow(followerId, authorId);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':authorId/follow')
  async unfollowUser(@Param('authorId') authorId: string, @Request() req: any) {
    const followerId = req.user.userId;
    return this.usersService.unfollow(followerId, authorId);
  }
}
