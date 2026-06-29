import { Controller, Get, Param, Query } from '@nestjs/common';
import { BistService } from './bist.service';

@Controller('bist')
export class BistController {
  constructor(private readonly bist: BistService) {}

  @Get('search')
  searchSymbols(
    @Query('q') q: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.bist.searchSymbols(
      q ?? '',
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @Get('symbols')
  listSymbols(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.bist.listSymbols(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @Get('indices')
  getIndices() {
    return this.bist.getIndices();
  }

  @Get('companies')
  getCompanies() {
    return this.bist.getCompanies();
  }

  @Get('latest')
  getLatest(@Query('symbols') symbols: string | string[]) {
    const list = Array.isArray(symbols)
      ? symbols
      : symbols
        ? symbols.split(',').map((s) => s.trim())
        : [];
    return this.bist.getLatest(list);
  }

  @Get(':symbol/ohlc')
  getOhlc(
    @Param('symbol') symbol: string,
    @Query('interval') interval?: string,
    @Query('limit') limit?: string,
  ) {
    return this.bist.getOhlc(
      symbol,
      interval ?? '1h',
      limit ? parseInt(limit, 10) : 300,
    );
  }

  @Get(':symbol')
  getTick(@Param('symbol') symbol: string) {
    return this.bist.getTick(symbol);
  }
}
