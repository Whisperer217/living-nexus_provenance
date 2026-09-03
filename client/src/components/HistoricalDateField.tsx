import { CalendarDays, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  formatHistoricalDate,
  formatHistoricalDateValue,
  parseHistoricalDate,
} from "@shared/workHistoricalDates";

type HistoricalDateFieldProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  helpText: string;
  minDate?: string;
  maxDate?: string;
  popoverContainer?: HTMLElement | null;
  className?: string;
};

export function HistoricalDateField({
  id,
  label,
  value,
  onChange,
  helpText,
  minDate,
  maxDate,
  popoverContainer,
  className,
}: HistoricalDateFieldProps) {
  const selected = parseHistoricalDate(value);
  const minimum = parseHistoricalDate(minDate);
  const maximum = parseHistoricalDate(maxDate);

  return (
    <div className={className}>
      <label htmlFor={id} className="block text-xs" style={{ color: "color-mix(in srgb, var(--ln-parchment) 72%, transparent)" }}>
        {label}
      </label>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            className="mt-1 h-10 w-full justify-between bg-transparent px-3 text-left font-normal hover:bg-[rgba(196,154,40,0.08)]"
            style={{ borderColor: "rgba(196,154,40,0.34)", color: "var(--ln-parchment)" }}
            aria-label={`${label}: ${formatHistoricalDate(value) ?? "not set"}`}
          >
            <span className={selected ? "truncate" : "truncate opacity-55"}>
              {formatHistoricalDate(value) ?? "Select date"}
            </span>
            <CalendarDays aria-hidden="true" className="ml-3 size-4 shrink-0" style={{ color: "var(--ln-gold)" }} />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="z-[10020] w-auto border border-[rgba(196,154,40,0.35)] bg-[var(--ln-void,#0d0a12)] p-0 text-[var(--ln-parchment)]"
          {...(popoverContainer ? { container: popoverContainer } : {})}
        >
          <Calendar
            mode="single"
            selected={selected}
            onSelect={(date) => onChange(date ? formatHistoricalDateValue(date) : "")}
            disabled={(date) => (minimum ? date < minimum : false) || (maximum ? date > maximum : false)}
            initialFocus
          />
          {value && (
            <div className="border-t border-[rgba(196,154,40,0.22)] p-2">
              <button
                type="button"
                onClick={() => onChange("")}
                className="inline-flex items-center gap-1.5 text-xs text-[var(--ln-gold)] hover:underline"
              >
                <X aria-hidden="true" className="size-3" /> Clear date
              </button>
            </div>
          )}
        </PopoverContent>
      </Popover>
      <p className="mt-1.5 text-[11px] leading-relaxed" style={{ color: "color-mix(in srgb, var(--ln-parchment) 46%, transparent)" }}>
        {helpText}
      </p>
    </div>
  );
}
