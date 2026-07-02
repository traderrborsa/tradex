export class CreatePanelRoleDto {
  businessId!: string;
  name!: string;
  displayName!: string;
  description?: string;
  permissionKeys?: string[];
  isActive?: boolean;
  isHidden?: boolean;
}

export class UpdatePanelRoleDto {
  name?: string;
  displayName?: string;
  description?: string | null;
  permissionKeys?: string[];
  isActive?: boolean;
  isHidden?: boolean;
}
