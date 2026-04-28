import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";

const inputBase =
  "w-full px-4 py-3 rounded-xl text-sm bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 outline-none transition-all duration-200 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:border-violet-400 dark:focus:border-violet-500 focus:ring-4 focus:ring-violet-50 dark:focus:ring-violet-900/20";

export function Input({ className = "", ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${inputBase} ${className}`} {...rest} />;
}

export function Textarea({
  className = "",
  ...rest
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={`${inputBase} resize-none ${className}`}
      {...rest}
    />
  );
}

interface FieldProps {
  label?: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}

export function Field({ label, hint, error, children, className = "" }: FieldProps) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400">
          {label}
        </label>
      )}
      {children}
      {hint && !error && (
        <p className="text-xs text-zinc-400 dark:text-zinc-500">{hint}</p>
      )}
      {error && (
        <p className="text-xs text-red-500">{error}</p>
      )}
    </div>
  );
}
