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

@ApiTags('Search')
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @ApiOperation({
    summary: 'Hybrid search (full-text + vector) across articles and people',
  })
  @ApiQuery({ name: 'q', required: true, type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiQuery({ name: 'offset', required: false, type: Number, example: 0 })
  @ApiResponse({
    status: 200,
    description: 'Matching articles, people, and per-section totals',
  })
  async search(
    @Query('q') q: string,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number,
  ) {
    return this.searchService.search(q ?? '', { limit, offset });
  }

  @Post('reindex')
  @ApiOperation({ summary: 'Rebuild the search index from the database' })
  @ApiResponse({ status: 200, description: 'Index rebuilt' })
  async reindex() {
    return this.searchService.refresh();
  }
}
