import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "../ui/Select";
import { Flex } from "@radix-ui/themes";

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
    <Flex direction="column" gap="8">
      <Flex direction="column" gap="1">
        <h2 className="text-lg font-semibold">你的时区是？</h2>
        <p className="text-sm text-muted-foreground">TA 会根据你的时间说早晚安</p>
      </Flex>
      <Select value={data.timezone} onValueChange={(v) => update({ timezone: v })}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="选择时区..." />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>亚洲</SelectLabel>
            {ZONES.filter((z) => z.startsWith("Asia")).map((z) => (
              <SelectItem key={z} value={z}>{z}</SelectItem>
            ))}
          </SelectGroup>
          <SelectGroup>
            <SelectLabel>欧洲</SelectLabel>
            {ZONES.filter((z) => z.startsWith("Europe")).map((z) => (
              <SelectItem key={z} value={z}>{z}</SelectItem>
            ))}
          </SelectGroup>
          <SelectGroup>
            <SelectLabel>美洲</SelectLabel>
            {ZONES.filter((z) => z.startsWith("America")).map((z) => (
              <SelectItem key={z} value={z}>{z}</SelectItem>
            ))}
          </SelectGroup>
          <SelectGroup>
            <SelectLabel>大洋洲 / 太平洋</SelectLabel>
            {ZONES.filter((z) => z.startsWith("Australia") || z.startsWith("Pacific")).map((z) => (
              <SelectItem key={z} value={z}>{z}</SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </Flex>
  );
}
