export class CreateBankDto {
  businessId!: string;
  name!: string;
  isActive?: boolean;
}

export class UpdateBankDto {
  name?: string;
  isActive?: boolean;
}
