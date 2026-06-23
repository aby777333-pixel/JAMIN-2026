/** Dynamic form field schema (§5.11) — stored in form_definitions.fields, never hardcoded. */
export type FieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'tel'
  | 'email'
  | 'select'
  | 'checkbox'
  | 'date';

export interface FormField {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  placeholder?: string;
  help?: string;
  options?: string[];
}

export const FIELD_TYPES: FieldType[] = [
  'text',
  'textarea',
  'number',
  'tel',
  'email',
  'select',
  'checkbox',
  'date',
];

export type FormValues = Record<string, string | number | boolean | undefined>;
