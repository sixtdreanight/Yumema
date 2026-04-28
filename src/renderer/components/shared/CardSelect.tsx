interface Option<T extends string> {
  value: T;
  label: string;
  desc?: string;
  icon?: string;
}

export default function CardSelect<T extends string>({
  options, value, onChange,
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
            className={`w-full p-4 rounded-xl text-left transition-all duration-200 ${
              active
                ? "bg-violet-50 dark:bg-violet-950 border-violet-300 dark:border-violet-700 shadow-sm"
                : "bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600 hover:shadow-sm"
            } border active:scale-[0.99]`}
          >
            <div className="flex items-center gap-3">
              {opt.icon && <span className="text-xl">{opt.icon}</span>}
              <div className="flex-1 min-w-0">
                <div className={`text-sm font-medium ${
                  active ? "text-violet-700 dark:text-violet-300" : "text-zinc-700 dark:text-zinc-200"
                }`}>
                  {opt.label}
                </div>
                {opt.desc && (
                  <div className="text-xs mt-0.5 text-zinc-400 dark:text-zinc-500">{opt.desc}</div>
                )}
              </div>
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all duration-200 ${
                  active ? "border-violet-500 bg-violet-500 scale-100" : "border-zinc-300 dark:border-zinc-600 scale-90"
                }`}
              >
                {active && (
                  <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6L5 9L10 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
