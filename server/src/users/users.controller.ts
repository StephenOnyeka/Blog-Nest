import {
  Controller,
  Get,
  Patch,
  Put,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedRequest } from '../common/auth-request';

interface UpdateProfileBody {
  name?: string;
  username?: string;
  avatar?: string;
  bio?: string;
}

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get(':id')
  @ApiOperation({ summary: 'Get public profile by UUID or username' })
  @ApiParam({ name: 'id', description: 'User public UUID or username' })
  @ApiResponse({ status: 200, description: 'Profile found' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getProfile(@Param('id') id: string) {
    return this.usersService.getProfile(id);
  }

  @Get(':id/following')
  @ApiOperation({ summary: 'List users that a given user is following' })
  @ApiParam({ name: 'id', description: 'User public UUID or username' })
  @ApiResponse({
    status: 200,
    description: 'Array of followed user mini profiles',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getFollowing(@Param('id') id: string) {
    return this.usersService.getFollowing(id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Partial update of user profile (bio, avatar, name, social links)',
  })
  @ApiParam({ name: 'id', description: 'User public UUID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        bio: { type: 'string' },
        avatar: { type: 'string', description: 'Base64 image or URL' },
        avatar_type: { type: 'string', example: 'dicebear' },
        dicebear_seed: { type: 'string', example: 'Felix' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Profile updated' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async patchProfile(
    @Param('id') id: string,
    @Body() body: UpdateProfileBody,
    @Request() req: AuthenticatedRequest,
  ) {
    if (req.user.userId !== id) {
      throw new UnauthorizedException('You can only update your own profile');
    }
    return this.usersService.updateProfile(id, body);
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Full update of user profile' })
  @ApiParam({ name: 'id', description: 'User public UUID' })
  @ApiResponse({ status: 200, description: 'Profile updated' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async putProfile(
    @Param('id') id: string,
    @Body() body: UpdateProfileBody,
    @Request() req: AuthenticatedRequest,
  ) {
    if (req.user.userId !== id) {
      throw new UnauthorizedException('You can only update your own profile');
    }
    return this.usersService.updateProfile(id, body);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':authorId/follow')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Follow a user' })
  @ApiParam({
    name: 'authorId',
    description: 'Public UUID of author to follow',
  })
  @ApiResponse({ status: 201, description: 'Successfully followed user' })
  @ApiResponse({ status: 400, description: 'Cannot follow yourself' })
  async followUser(
    @Param('authorId') authorId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    const followerId = req.user.userId;
    return this.usersService.follow(followerId, authorId);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':authorId/follow')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Unfollow a user' })
  @ApiParam({
    name: 'authorId',
    description: 'Public UUID of author to unfollow',
  })
  @ApiResponse({ status: 200, description: 'Successfully unfollowed user' })
  async unfollowUser(
    @Param('authorId') authorId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    const followerId = req.user.userId;
    return this.usersService.unfollow(followerId, authorId);
  }
}
