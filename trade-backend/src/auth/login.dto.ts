export interface LoginDto {
  email: string;
  password: string;
  businessId: string;
  registeredViaApp?: string;
}
