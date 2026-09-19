import { Check, ChevronsUpDown, Phone } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  COUNTRY_CODES,
  formatDialingLabel,
  toE164,
  type CountryDialingCode,
} from "@/lib/countryCodes";
import { cn } from "@/lib/utils";

interface PhoneInputProps {
  value: string; // national number digits
  onChange: (nationalNumber: string) => void;
  country: CountryDialingCode;
  onCountryChange: (country: CountryDialingCode) => void;
  disabled?: boolean;
  name?: string; // hidden input name for the composed E.164 value
}

/**
 * Country-code dropdown + national number field.
 * Renders a hidden input with the composed E.164 number when `name` is given.
 */
export function PhoneInput({
  value,
  onChange,
  country,
  onCountryChange,
  disabled,
  name,
}: PhoneInputProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return COUNTRY_CODES;
    return COUNTRY_CODES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.iso.toLowerCase().includes(q) ||
        c.code.includes(q.replace(/^\+?/, "+")),
    );
  }, [query]);

  // Persist the chosen country for next visits
  useEffect(() => {
    try {
      localStorage.setItem("vstarz:country", country.iso);
    } catch {
      // storage unavailable — non-fatal
    }
  }, [country.iso]);

  return (
    <div className="flex gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-[132px] shrink-0 justify-between gap-1 px-3 font-normal"
            disabled={disabled}
          >
            <span className="truncate text-sm">
              {country.flag} {country.code}
            </span>
            <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[280px] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Search country or code..."
              value={query}
              onValueChange={setQuery}
            />
            <CommandList>
              <CommandEmpty>No country found.</CommandEmpty>
              <CommandGroup>
                {filtered.map((c) => (
                  <CommandItem
                    key={`${c.iso}-${c.code}`}
                    value={`${c.name} ${c.code}`}
                    onSelect={() => {
                      onCountryChange(c);
                      setOpen(false);
                      setQuery("");
                    }}
                    className="gap-2"
                  >
                    <Check
                      className={cn(
                        "mr-1 h-4 w-4",
                        c.iso === country.iso ? "opacity-100" : "opacity-0",
                      )}
                    />
                    <span>{formatDialingLabel(c)}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <div className="relative flex-1">
        <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          inputMode="tel"
          autoComplete="tel-national"
          placeholder="79 499 9885"
          className="pl-9"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          required
        />
        {name && (
          <input
            type="hidden"
            name={name}
            value={toE164(country.code, value)}
          />
        )}
      </div>
    </div>
  );
}
