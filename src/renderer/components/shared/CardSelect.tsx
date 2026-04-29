import { Check } from "lucide-react";
import { Card } from "../ui/card";

interface Option<T extends string> {
  value: T;
  label: string;
  desc?: string;
  icon?: string;
}

export default function CardSelect<T extends string>({
  options,
  value,
  onChange,
}: {
  options: Option<T>[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="space-y-2">
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className="w-full text-left transition-all duration-200 active:scale-[0.98] hover:scale-[1.01]"
          >
            <Card
              className={`p-4 transition-all duration-200 ${
                active
                  ? "ring-2 ring-primary border-primary bg-primary/5"
                  : "hover:border-primary/30"
              }`}
            >
              <div className="flex items-center gap-3">
                {opt.icon && <span className="text-xl">{opt.icon}</span>}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">
                    {opt.label}
                  </div>
                  {opt.desc && (
                    <div className="text-xs mt-0.5 text-muted-foreground">
                      {opt.desc}
                    </div>
                  )}
                </div>
                {active && (
                  <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 text-primary-foreground" />
                  </div>
                )}
              </div>
            </Card>
          </button>
        );
      })}
    </div>
  );
}
