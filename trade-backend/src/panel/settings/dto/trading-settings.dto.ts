import type {
  BusinessSettingsPartial,
  TradingSettingsPartial,
} from '../../../trading/trading-config.types';

export class TradingSettingsDto implements BusinessSettingsPartial {
  initialBalance?: number;
  commissionRate?: number;
  leverageOptions?: number[];
  leverage?: number;
  minLot?: number;
  maxLot?: number | null;
  lotStep?: number;
  swapForexLong?: number;
  swapForexShort?: number;
  swapOtherLong?: number;
  swapOtherShort?: number;
  minDeposit?: number;
  minWithdraw?: number;
}

export class UpdateTradingSettingsDto {
  settings!: TradingSettingsDto;
}

export class MemberTradingSettingsDto implements TradingSettingsPartial {
  commissionRate?: number;
  leverageOptions?: number[];
  leverage?: number;
  minLot?: number;
  maxLot?: number | null;
  lotStep?: number;
  swapForexLong?: number;
  swapForexShort?: number;
  swapOtherLong?: number;
  swapOtherShort?: number;
  minDeposit?: number;
  minWithdraw?: number;
}

export class UpdateMemberTradingSettingsDto {
  settings!: MemberTradingSettingsDto;
}
