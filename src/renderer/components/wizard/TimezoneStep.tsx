const ZONES = [
  "Asia/Shanghai", "Asia/Tokyo", "Asia/Seoul", "Asia/Singapore",
  "Asia/Hong_Kong", "Asia/Taipei", "Asia/Bangkok", "Asia/Kolkata",
  "Europe/London", "Europe/Paris", "Europe/Berlin", "Europe/Moscow",
  "America/New_York", "America/Chicago", "America/Los_Angeles",
  "America/Toronto", "America/Sao_Paulo", "Australia/Sydney",
  "Pacific/Auckland", "Pacific/Honolulu",
];

export default function TimezoneStep({
  data, update,
}: {
  data: { timezone: string };
  update: (d: Partial<{ timezone: string }>) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h2 className="text-lg font-semibold text-zinc-800 dark:text-zinc-100">你的时区是？</h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">TA 会根据你的时间说早晚安</p>
      </div>
      <div className="relative">
        <select
          value={data.timezone}
          onChange={(e) => update({ timezone: e.target.value })}
          className="w-full px-4 py-3 rounded-xl text-sm bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 outline-none transition-all duration-200 appearance-none cursor-pointer focus:border-violet-400 dark:focus:border-violet-500 focus:ring-4 focus:ring-violet-50 dark:focus:ring-violet-900/20"
        >
          {ZONES.map((z) => (
            <option key={z} value={z}>{z}</option>
          ))}
        </select>
        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400 dark:text-zinc-500">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M3 5l3 3 3-3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>
    </div>
  );
}
