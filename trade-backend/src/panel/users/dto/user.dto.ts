export class CreatePanelUserDto {
  email!: string;
  password!: string;
  fullName!: string;
  tcKimlikNo!: string;
  phone!: string;
  referenceNumber?: string;
  roleIds?: string[];
  businessIds?: string[];
  createTradingAccount?: boolean;
}

export class UpdatePanelUserDto {
  email?: string;
  password?: string;
  fullName?: string;
  tcKimlikNo?: string;
  phone?: string;
  referenceNumber?: string | null;
  roleIds?: string[];
  businessIds?: string[];
}
