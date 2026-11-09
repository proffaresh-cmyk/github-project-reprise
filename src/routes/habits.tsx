import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell, Panel } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { deleteHabit, saveHabit, toggleHabitLog } from "@/lib/api.functions";
import { requireAuth } from "@/lib/guard";
import { habitsQuery } from "@/lib/queries";

export const Route = createFileRoute("/habits")({
  head: () => ({
    meta: [
      { title: "العادات — منظّمي" },
      { name: "description", content: "تتبّع عاداتك اليومية والأسبوعية وسلاسل الإنجاز." },
      { property: "og:title", content: "العادات — منظّمي" },
      { property: "og:description", content: "تتبّع عاداتك اليومية والأسبوعية وسلاسل الإنجاز." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  beforeLoad: requireAuth,
  loader: ({ context }) => context.queryClient.ensureQueryData(habitsQuery),
  component: HabitsPage,
});

function HabitsPage() {
  const { data } = useSuspenseQuery(habitsQuery);
  const qc = useQueryClient();
  const refresh = () => qc.invalidateQueries();
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("✅");
  const [frequency, setFrequency] = useState<"daily" | "weekly">("daily");

  const toggle = useMutation({ mutationFn: (id: string) => toggleHabitLog({ data: { habit_id: id, date: data.today } }), onSuccess: refresh });
  const remove = useMutation({ mutationFn: (id: string) => deleteHabit({ data: { id } }), onSuccess: refresh });
  const add = useMutation({
    mutationFn: () => saveHabit({ data: { name, emoji, frequency } }),
    onSuccess: () => {
      setName("");
      toast.success("أُضيفت العادة");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AppShell title="العادات" subtitle="علّم ما أنجزته اليوم">
      <div className="space-y-3">
        {data.habits.map((h) => {
          const done = h.dates.includes(data.today);
          return (
            <Panel key={h.id} className="flex items-center gap-3">
              <button
                onClick={() => toggle.mutate(h.id)}
                className={`flex size-12 items-center justify-center rounded-xl border text-2xl transition-colors ${done ? "bg-primary text-primary-foreground" : "bg-muted"}`}
                aria-label={done ? "إلغاء الإنجاز" : "تم الإنجاز"}
              >
                {h.emoji}
              </button>
              <div className="flex-1">
                <p className="font-semibold text-foreground">{h.name}</p>
                <p className="text-sm text-muted-foreground">
                  {h.frequency === "daily" ? "يومية" : "أسبوعية"} · 🔥 {h.streak}
                </p>
              </div>
              <Button variant="ghost" size="icon" aria-label="حذف" onClick={() => confirm("حذف العادة؟") && remove.mutate(h.id)}>
                <Trash2 />
              </Button>
            </Panel>
          );
        })}
        <Panel>
          <form
            className="flex flex-wrap gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (name.trim()) add.mutate();
            }}
          >
            <Input className="w-16 text-center" value={emoji} onChange={(e) => setEmoji(e.target.value)} />
            <Input className="flex-1" placeholder="عادة جديدة" value={name} onChange={(e) => setName(e.target.value)} />
            <select
              className="rounded-md border bg-background px-2 text-sm"
              value={frequency}
              onChange={(e) => setFrequency(e.target.value as "daily" | "weekly")}
            >
              <option value="daily">يومية</option>
              <option value="weekly">أسبوعية</option>
            </select>
            <Button type="submit" size="icon" aria-label="إضافة" disabled={add.isPending}>
              <Plus />
            </Button>
          </form>
        </Panel>
      </div>
    </AppShell>
  );
}
