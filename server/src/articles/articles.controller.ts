import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { ArticlesService } from './articles.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Articles')
@Controller('articles')
export class ArticlesController {
  constructor(private readonly articlesService: ArticlesService) {}

  @Get()
  @ApiOperation({
    summary:
      'Get paginated list of articles with optional tag and author filters',
  })
  @ApiQuery({ name: 'tag', required: false, type: String })
  @ApiQuery({ name: 'author_id', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiResponse({
    status: 200,
    description: 'Returns articles list and pagination metadata',
  })
  async findAll(
    @Query('tag') tag?: string,
    @Query('author_id') authorId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.articlesService.findAll(
      tag,
      authorId,
      page ? +page : 1,
      limit ? +limit : 10,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('bookmarked')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'List articles bookmarked by the logged-in user' })
  @ApiResponse({ status: 200, description: 'Array of bookmarked articles' })
  async getBookmarked(@Request() req: any) {
    return this.articlesService.getBookmarkedArticles(req.user.userId);
  }

  @Get(':id/comments')
  @ApiOperation({ summary: 'List comments for an article' })
  @ApiParam({ name: 'id', description: 'Article public UUID' })
  @ApiResponse({
    status: 200,
    description: 'Array of comments with author info',
  })
  @ApiResponse({ status: 404, description: 'Article not found' })
  async getComments(@Param('id') id: string) {
    return this.articlesService.getComments(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/comments')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Add a comment or reply to an article' })
  @ApiParam({ name: 'id', description: 'Article public UUID' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['body'],
      properties: {
        body: { type: 'string' },
        parentId: {
          type: 'string',
          description: 'Optional comment UUID to reply to',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Comment created' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async addComment(
    @Param('id') id: string,
    @Body() body: any,
    @Request() req: any,
  ) {
    const text = body?.body?.trim();
    if (!text) throw new BadRequestException('Comment body is required');
    return this.articlesService.addComment(
      id,
      req.user.userId,
      text,
      body?.parentId,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id/comments/:commentId')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Delete a comment (author or article author only)' })
  @ApiParam({ name: 'id', description: 'Article public UUID' })
  @ApiParam({ name: 'commentId', description: 'Comment public UUID' })
  @ApiResponse({ status: 200, description: 'Comment deleted' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Comment not found' })
  async deleteComment(
    @Param('id') id: string,
    @Param('commentId') commentId: string,
    @Request() req: any,
  ) {
    return this.articlesService.deleteComment(id, commentId, req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/bookmark')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Check if the logged-in user has bookmarked an article',
  })
  @ApiParam({ name: 'id', description: 'Article public UUID' })
  @ApiResponse({ status: 200, description: 'Bookmark status' })
  async getBookmarkStatus(@Param('id') id: string, @Request() req: any) {
    return this.articlesService.getBookmarkStatus(id, req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/bookmark')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Bookmark an article' })
  @ApiParam({ name: 'id', description: 'Article public UUID' })
  @ApiResponse({ status: 201, description: 'Article bookmarked' })
  async bookmark(@Param('id') id: string, @Request() req: any) {
    return this.articlesService.bookmark(id, req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id/bookmark')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Remove a bookmark from an article' })
  @ApiParam({ name: 'id', description: 'Article public UUID' })
  @ApiResponse({ status: 200, description: 'Bookmark removed' })
  async unbookmark(@Param('id') id: string, @Request() req: any) {
    return this.articlesService.unbookmark(id, req.user.userId);
  }

  @Get(':id/related')
  @ApiOperation({ summary: 'Get articles related by author or tags' })
  @ApiParam({ name: 'id', description: 'Article public UUID' })
  @ApiResponse({ status: 200, description: 'Related articles split by author and tags' })
  @ApiResponse({ status: 404, description: 'Article not found' })
  async getRelated(@Param('id') id: string) {
    return this.articlesService.getRelated(id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get single article details by UUID' })
  @ApiParam({ name: 'id', description: 'Article public UUID' })
  @ApiResponse({ status: 200, description: 'Article details' })
  @ApiResponse({ status: 404, description: 'Article not found' })
  async findOne(@Param('id') id: string) {
    return this.articlesService.findOne(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create a new article' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['title', 'body'],
      properties: {
        title: {
          type: 'string',
          example: 'Getting Started with NestJS & TypeORM',
        },
        subtitle: {
          type: 'string',
          example: 'A complete guide for modern Node.js developers',
        },
        body: {
          type: 'string',
          example: 'Markdown or HTML body content of article...',
        },
        cover_image: {
          type: 'string',
          example: 'https://images.unsplash.com/photo-1',
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          example: ['NodeJS', 'TypeScript', 'Backend'],
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Article successfully created' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async create(@Body() body: any, @Request() req: any) {
    return this.articlesService.create(req.user.userId, body);
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update an existing article' })
  @ApiParam({ name: 'id', description: 'Article public UUID' })
  @ApiResponse({ status: 200, description: 'Article updated' })
  @ApiResponse({ status: 403, description: 'Forbidden (Not the author)' })
  async update(
    @Param('id') id: string,
    @Body() body: any,
    @Request() req: any,
  ) {
    return this.articlesService.update(id, req.user.userId, body);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Delete an article' })
  @ApiParam({ name: 'id', description: 'Article public UUID' })
  @ApiResponse({ status: 200, description: 'Article deleted' })
  @ApiResponse({ status: 403, description: 'Forbidden (Not the author)' })
  async remove(@Param('id') id: string, @Request() req: any) {
    return this.articlesService.remove(id, req.user.userId);
  }

  @Post(':id/clap')
  @ApiOperation({ summary: 'Increment clap count for an article' })
  @ApiParam({ name: 'id', description: 'Article public UUID' })
  @ApiResponse({ status: 200, description: 'Clap registered' })
  async clap(@Param('id') id: string) {
    return this.articlesService.clap(id);
  }
}
