import { BEDROOM_FORM_OPTIONS } from "@/lib/bedrooms";
import { cn } from "@/lib/utils";

type BedroomsSelectProps = {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  disabled?: boolean;
};

export function BedroomsSelect({
  value,
  onChange,
  className,
  disabled,
}: BedroomsSelectProps) {
  return (
    <select
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      className={cn(className)}
    >
      {BEDROOM_FORM_OPTIONS.map(({ value: optionValue, label }) => (
        <option key={optionValue} value={optionValue}>
          {label}
        </option>
      ))}
    </select>
  );
}
