export class CreatePanelMemberDto {
  email!: string;
  password!: string;
  fullName!: string;
  tcKimlikNo!: string;
  phone!: string;
  referenceNumber?: string;
  businessId?: string;
}
