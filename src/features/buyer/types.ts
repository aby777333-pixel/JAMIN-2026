export type PropertyStatus = 'available' | 'reserved' | 'sold';

export interface PropertyRef {
  name: string;
  code?: string;
  location?: string | null;
}

export interface PropertyListItem {
  id: string;
  plot_code: string;
  price: number;
  status: PropertyStatus;
  media: unknown;
  attrs: Record<string, unknown>;
  coordinates: { lat?: number; lng?: number } | null;
  project: PropertyRef | null;
  type: { slug: string; name: string } | null;
}

export interface PropertyDetail extends PropertyListItem {
  project_id: string;
  plan: { name: string } | null;
}

export interface PropertyFilters {
  search?: string;
  propertyTypeId?: string | null;
  projectId?: string | null;
  priceMin?: number | null;
  priceMax?: number | null;
  status?: PropertyStatus;
  savedOnly?: boolean;
}

export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'number' | 'select';
  options?: string[];
}
