import {
  Controller,
  Get,
  Post,
  Query,
  DefaultValuePipe,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { SearchService } from './search.service';
import type { SearchMode } from './search.service';

@ApiTags('Search')
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @ApiOperation({
    summary:
      'Search published articles with full-text, vector, or hybrid search',
  })
  @ApiQuery({ name: 'q', required: true, type: String })
  @ApiQuery({
    name: 'mode',
    required: false,
    enum: ['fulltext', 'hybrid', 'vector'],
    description: 'Search mode. Defaults to "hybrid".',
  })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiQuery({ name: 'offset', required: false, type: Number, example: 0 })
  @ApiResponse({
    status: 200,
    description: 'Matching articles and total count',
  })
  async search(
    @Query('q') q: string,
    @Query('mode') mode: SearchMode = 'hybrid',
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number,
  ) {
    return this.searchService.search(q ?? '', { mode, limit, offset });
  }

  @Post('reindex')
  @ApiOperation({ summary: 'Rebuild the search index from the database' })
  @ApiResponse({ status: 200, description: 'Index rebuilt' })
  async reindex() {
    return this.searchService.refresh();
  }
}
