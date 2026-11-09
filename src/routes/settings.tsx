import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell, Panel, Section } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveSettings, sendTestMessage } from "@/lib/api.functions";
import { requireAuth } from "@/lib/guard";
import { settingsQuery } from "@/lib/queries";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "الإعدادات — منظّمي" },
      { name: "description", content: "المنطقة الزمنية وأوقات التذكير وربط بوت تيليجرام." },
      { property: "og:title", content: "الإعدادات — منظّمي" },
      { property: "og:description", content: "المنطقة الزمنية وأوقات التذكير وربط بوت تيليجرام." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  beforeLoad: requireAuth,
  loader: ({ context }) => context.queryClient.ensureQueryData(settingsQuery),
  component: SettingsPage,
});

function SettingsPage() {
  const { data } = useSuspenseQuery(settingsQuery);
  const qc = useQueryClient();
  const [form, setForm] = useState({
    timezone: data.timezone,
    nag_interval_min: data.nag_interval_min,
    wake_time: data.wake_time,
    sleep_time: data.sleep_time,
    study_goal_hours: data.study_goal_hours,
  });
  const save = useMutation({
    mutationFn: () => saveSettings({ data: form }),
    onSuccess: () => {
      toast.success("حُفظت الإعدادات");
      qc.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const test = useMutation({
    mutationFn: () => sendTestMessage(),
    onSuccess: (r) => (r.ok ? toast.success("أُرسلت الرسالة") : toast.error(r.error ?? "تعذّر الإرسال")),
    onError: (e: Error) => toast.error(e.message),
  });

  const field = (label: string, key: keyof typeof form, type = "text") => (
    <div className="space-y-1">
      <Label>{label}</Label>
      <Input
        type={type}
        value={form[key]}
        onChange={(e) =>
          setForm({ ...form, [key]: type === "number" ? Number(e.target.value) : e.target.value })
        }
      />
    </div>
  );

  return (
    <AppShell title="الإعدادات">
      <Section title="عام">
        <Panel className="space-y-3">
          {field("المنطقة الزمنية", "timezone")}
          {field("تكرار الإلحاح (دقائق)", "nag_interval_min", "number")}
          {field("وقت الاستيقاظ", "wake_time", "time")}
          {field("وقت النوم", "sleep_time", "time")}
          {field("هدف الدراسة اليومي (ساعات)", "study_goal_hours", "number")}
          <Button onClick={() => save.mutate()} disabled={save.isPending}>حفظ</Button>
        </Panel>
      </Section>
      <Section title="بوت تيليجرام">
        <Panel className="space-y-2 text-sm">
          <p>الاتصال: {data.telegramConnected ? "✅ متصل" : "❌ غير متصل"}</p>
          <p>ربط حسابك: {data.ownerLinked ? "✅ مربوط" : "أرسل /start للبوت"}</p>
          {data.webhook?.lastError && <p className="text-destructive">{data.webhook.lastError}</p>}
          <Button variant="outline" onClick={() => test.mutate()} disabled={!data.telegramConnected || test.isPending}>
            إرسال رسالة تجريبية
          </Button>
        </Panel>
      </Section>
    </AppShell>
  );
}
