export class CreateDepositBankAccountDto {
  businessId!: string;
  bankId!: string;
  accountHolderName!: string;
  iban!: string;
  description?: string | null;
  isActive?: boolean;
}

export class UpdateDepositBankAccountDto {
  bankId?: string;
  accountHolderName?: string;
  iban?: string;
  description?: string | null;
  isActive?: boolean;
}
