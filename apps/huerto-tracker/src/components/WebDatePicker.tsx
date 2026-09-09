export interface WebDatePickerProps {
  value: string;
  label: string;
  onChange: (value: string) => void;
}

// Native screens keep using the existing community DateTimePicker.
export function WebDatePicker(_props: WebDatePickerProps) { return null; }
