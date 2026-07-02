export class CreatePanelBusinessDto {
  name!: string;
  displayName!: string;
  slug?: string;
  isActive?: boolean;
  staffUserIds?: string[];
}

export class UpdatePanelBusinessDto {
  name?: string;
  displayName?: string;
  slug?: string | null;
  isActive?: boolean;
  staffUserIds?: string[];
}
