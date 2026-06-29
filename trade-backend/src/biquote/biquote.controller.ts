import { Controller, Get, Param, Query } from '@nestjs/common';
import { BiquoteService } from './biquote.service';

@Controller('market')
export class BiquoteController {
  constructor(private readonly biquote: BiquoteService) {}

  @Get('symbols/search')
  searchSymbols(@Query('q') q: string) {
    return this.biquote.searchSymbols(q ?? '');
  }

  @Get('symbols/browse')
  browseSymbols(
    @Query('category') category: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const cat = category === 'forex' || category === 'us' ? category : 'forex';
    return this.biquote.browseSymbols(
      cat,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @Get('symbols')
  getSymbols(
    @Query('type') type?: string,
    @Query('exchange') exchange?: string,
  ) {
    return this.biquote.getSymbols(type, exchange);
  }

  @Get('active')
  getActive() {
    return this.biquote.getActiveSymbols();
  }

  @Get('latest')
  getLatest(@Query('symbols') symbols: string | string[]) {
    const list = Array.isArray(symbols)
      ? symbols
      : symbols
        ? [symbols]
        : [];
    return this.biquote.getLatest(list);
  }

  @Get(':symbol/ohlc')
  getOhlc(
    @Param('symbol') symbol: string,
    @Query('interval') interval?: string,
    @Query('limit') limit?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.biquote.getOhlc(
      symbol,
      interval ?? '1h',
      limit ? parseInt(limit, 10) : 200,
      from,
      to,
    );
  }

  @Get(':symbol')
  getTick(@Param('symbol') symbol: string) {
    return this.biquote.getTick(symbol);
  }
}
