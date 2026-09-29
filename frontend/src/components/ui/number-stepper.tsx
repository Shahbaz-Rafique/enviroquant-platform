"use client";

import { Minus, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type NumberStepperProps = {
  id?: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  onChange: (value: number) => void;
};

export function NumberStepper({
  id,
  value,
  min = 0,
  max = 100,
  step = 5,
  disabled = false,
  onChange
}: NumberStepperProps) {
  const normalizedValue = clamp(value, min, max);

  function update(nextValue: number) {
    onChange(clamp(nextValue, min, max));
  }

  return (
    <div className="flex h-10 overflow-hidden rounded-xl border border-white/12 bg-white/[0.03] shadow-none backdrop-blur-sm focus-within:ring-2 focus-within:ring-[#67E8F9]/50">
      <Button
        aria-label="Decrease value"
        className="h-full rounded-none border-0 border-r border-white/10 bg-transparent shadow-none hover:bg-white/[0.08]"
        disabled={disabled || normalizedValue <= min}
        size="icon"
        type="button"
        variant="secondary"
        onClick={() => update(normalizedValue - step)}
      >
        <Minus />
      </Button>
      <Input
        id={id}
        className="h-full rounded-none border-0 bg-transparent text-center text-white shadow-none focus-visible:ring-0"
        disabled={disabled}
        inputMode="numeric"
        value={Math.round(normalizedValue)}
        onChange={(event) => update(Number(event.target.value))}
      />
      <Button
        aria-label="Increase value"
        className="h-full rounded-none border-0 border-l border-white/10 bg-transparent shadow-none hover:bg-white/[0.08]"
        disabled={disabled || normalizedValue >= max}
        size="icon"
        type="button"
        variant="secondary"
        onClick={() => update(normalizedValue + step)}
      >
        <Plus />
      </Button>
    </div>
  );
}

function clamp(value: number, min: number, max: number) {
  if (Number.isNaN(value)) {
    return min;
  }
  return Math.min(max, Math.max(min, value));
}
