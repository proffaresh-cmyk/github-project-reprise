import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell, Panel, Section } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { deleteStudyLog, logStudy } from "@/lib/api.functions";
import { DAY_SHORT } from "@/lib/constants";
import { requireAuth } from "@/lib/guard";
import { statsQuery } from "@/lib/queries";

export const Route = createFileRoute("/stats")({
  head: () => ({
    meta: [
      { title: "الإحصاء — منظّمي" },
      { name: "description", content: "ساعات الدراسة والمهام المنجزة خلال الأسبوع." },
      { property: "og:title", content: "الإحصاء — منظّمي" },
      { property: "og:description", content: "ساعات الدراسة والمهام المنجزة خلال الأسبوع." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  beforeLoad: requireAuth,
  loader: ({ context }) => context.queryClient.ensureQueryData(statsQuery),
  component: StatsPage,
});

function StatsPage() {
  const { data } = useSuspenseQuery(statsQuery);
  const qc = useQueryClient();
  const [hours, setHours] = useState("");
  const max = Math.max(data.goal, ...data.days.map((d) => d.study), 1);
  const add = useMutation({
    mutationFn: () => logStudy({ data: { hours: Number(hours) } }),
    onSuccess: () => {
      setHours("");
      toast.success("سُجّلت ساعات الدراسة");
      qc.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const remove = useMutation({ mutationFn: (id: string) => deleteStudyLog({ data: { id } }), onSuccess: () => qc.invalidateQueries() });

  return (
    <AppShell title="الإحصاء" subtitle={`هدف الدراسة: ${data.goal} ساعات يومياً`}>
      <Section title="الدراسة هذا الأسبوع">
        <Panel>
          <div className="flex h-40 items-end gap-2">
            {data.days.map((d) => (
              <div key={d.date} className="flex flex-1 flex-col items-center gap-1">
                <span className="text-xs text-muted-foreground">{d.study}</span>
                <div className="w-full rounded-t-md bg-primary" style={{ height: `${(d.study / max) * 100}%` }} />
                <span className="text-xs text-muted-foreground">{DAY_SHORT[new Date(d.date + "T12:00:00").getDay()]}</span>
              </div>
            ))}
          </div>
          <form
            className="mt-4 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (Number(hours) > 0) add.mutate();
            }}
          >
            <Input type="number" step="0.25" min="0" placeholder="عدد الساعات" value={hours} onChange={(e) => setHours(e.target.value)} />
            <Button type="submit" disabled={add.isPending}>سجّل</Button>
          </form>
        </Panel>
      </Section>
      <Section title="المهام المنجزة">
        <Panel className="flex justify-between text-sm">
          {data.days.map((d) => (
            <div key={d.date} className="text-center">
              <p className="text-lg font-semibold text-foreground">{d.done}</p>
              <p className="text-muted-foreground">{DAY_SHORT[new Date(d.date + "T12:00:00").getDay()]}</p>
            </div>
          ))}
        </Panel>
      </Section>
      <Section title="العادات">
        <Panel className="space-y-2">
          {data.habits.map((h) => (
            <div key={h.id} className="flex justify-between text-sm">
              <span>{h.emoji} {h.name}</span>
              <span className="text-muted-foreground">{h.week} هذا الأسبوع · 🔥 {h.streak}</span>
            </div>
          ))}
        </Panel>
      </Section>
      {data.logs.length > 0 && (
        <Section title="سجل الدراسة">
          <Panel className="space-y-2">
            {data.logs.map((l) => (
              <div key={l.id} className="flex items-center justify-between text-sm">
                <span>{l.log_date} · {Number(l.hours)} س {l.note ? `· ${l.note}` : ""}</span>
                <Button variant="ghost" size="icon" aria-label="حذف" onClick={() => remove.mutate(l.id)}>
                  <Trash2 />
                </Button>
              </div>
            ))}
          </Panel>
        </Section>
      )}
    </AppShell>
  );
}
