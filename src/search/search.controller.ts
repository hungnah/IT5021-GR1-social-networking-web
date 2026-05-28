import {
  Controller,
  Get,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard, JwtPayload } from '../auth/jwt-auth.guard';
import { SearchService } from './search.service';

type AuthRequest = Request & { user: JwtPayload };

@ApiTags('Search')
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  @ApiBearerAuth()
  search(
    @Req() req: AuthRequest,
    @Query('q') q?: string,
    @Query('limit') limitStr?: string,
  ) {
    const limit =
      limitStr !== undefined && limitStr !== ''
        ? parseInt(limitStr, 10)
        : 15;
    return this.searchService.search(q ?? '', req.user.sub, limit);
  }
}
