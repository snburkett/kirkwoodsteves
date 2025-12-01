'use client';

import { useEffect, useMemo, useState } from "react";

const STORAGE_KEYS = {
  entries: "macroTrackerEntries",
  dayType: "macroTrackerDayType",
  customDay: "macroTrackerCustomValues",
} as const;

interface DayType {
  name: string;
  baseCalories: number;
  deficit: number;
}

interface MacroEntry {
  id: string;
  protein: number;
  carbs: number;
  fat: number;
  notes: string;
  timestamp: string;
}

interface NutritionNeeds {
  minProtein: number;
  minFat: number;
}

const DEFAULT_DAY_TYPES: DayType[] = [
  { name: "Fat burn", baseCalories: 3100, deficit: 750 },
  { name: "Strength", baseCalories: 2500, deficit: 200 },
  { name: "Rest", baseCalories: 2000, deficit: 200 },
  { name: "Custom", baseCalories: 2500, deficit: 500 },
];

const DEFAULT_CUSTOM_DAY = {
  baseCalories: 2500,
  deficit: 500,
};

const DEFAULT_NEEDS: NutritionNeeds = {
  minProtein: 165,
  minFat: 65,
};

export default function SimpleMacroTracker() {
  const [dayTypes, setDayTypes] = useState<DayType[]>(DEFAULT_DAY_TYPES);
  const [dayType, setDayType] = useState<string>(DEFAULT_DAY_TYPES[0]!.name);
  const [entries, setEntries] = useState<MacroEntry[]>([]);
  const [newEntry, setNewEntry] = useState({ protein: "", carbs: "", fat: "", notes: "" });
  const [needs, setNeeds] = useState<NutritionNeeds>(DEFAULT_NEEDS);
  const [customDay, setCustomDay] = useState(DEFAULT_CUSTOM_DAY);

  useEffect(() => {
    try {
      const storedEntries = window.localStorage.getItem(STORAGE_KEYS.entries);
      if (storedEntries) {
        setEntries(JSON.parse(storedEntries));
      }

      const storedDayType = window.localStorage.getItem(STORAGE_KEYS.dayType);
      if (storedDayType) {
        setDayType(storedDayType);
      }

      const storedCustom = window.localStorage.getItem(STORAGE_KEYS.customDay);
      if (storedCustom) {
        const parsed = JSON.parse(storedCustom);
        setCustomDay(parsed);
        setDayTypes((existing) =>
          existing.map((type) =>
            type.name === "Custom"
              ? { ...type, baseCalories: parsed.baseCalories, deficit: parsed.deficit }
              : type,
          ),
        );
      }
    } catch {
      // no-op: corrupted storage clears on next save
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEYS.entries, JSON.stringify(entries));
  }, [entries]);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEYS.dayType, dayType);
  }, [dayType]);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEYS.customDay, JSON.stringify(customDay));
  }, [customDay]);

  const currentDay = useMemo(() => {
    if (dayType === "Custom") {
      return { name: "Custom", ...customDay };
    }
    return dayTypes.find((type) => type.name === dayType) ?? dayTypes[0]!;
  }, [dayType, dayTypes, customDay]);

  const totals = useMemo(() => {
    return entries.reduce(
      (acc, entry) => {
        acc.protein += entry.protein;
        acc.carbs += entry.carbs;
        acc.fat += entry.fat;
        return acc;
      },
      { protein: 0, carbs: 0, fat: 0 },
    );
  }, [entries]);

  const calories = totals.protein * 4 + totals.carbs * 4 + totals.fat * 9;
  const calorieTarget = Math.max(currentDay.baseCalories - currentDay.deficit, 0);
  const remainingCalories = Math.max(calorieTarget - calories, 0);
  const percents = {
    protein: percentage(totals.protein, needs.minProtein),
    fat: percentage(totals.fat, needs.minFat),
    calories: percentage(calories, calorieTarget || 1),
  };

  function handleAddEntry() {
    if (!newEntry.protein && !newEntry.carbs && !newEntry.fat) return;
    const entry: MacroEntry = {
      id: crypto.randomUUID(),
      protein: Number(newEntry.protein) || 0,
      carbs: Number(newEntry.carbs) || 0,
      fat: Number(newEntry.fat) || 0,
      notes: newEntry.notes.trim(),
      timestamp: new Date().toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }),
    };
    setEntries((prev) => [...prev, entry]);
    setNewEntry({ protein: "", carbs: "", fat: "", notes: "" });
  }

  function handleDeleteEntry(id: string) {
    setEntries((prev) => prev.filter((entry) => entry.id !== id));
  }

  function handleResetDay() {
    if (window.confirm("Reset entries for today? This cannot be undone.")) {
      setEntries([]);
      window.localStorage.removeItem(STORAGE_KEYS.entries);
    }
  }

  function handleCustomDayChange(field: "baseCalories" | "deficit", value: number) {
    const next = { ...customDay, [field]: value };
    setCustomDay(next);
    setDayTypes((existing) =>
      existing.map((type) =>
        type.name === "Custom" ? { ...type, baseCalories: next.baseCalories, deficit: next.deficit } : type,
      ),
    );
  }

  return (
    <section className="space-y-6 rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm">
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm uppercase tracking-wide text-slate-500">Oddities lab</p>
          <h2 className="text-2xl font-semibold text-slate-900">Macro tracker</h2>
          <p className="text-sm text-slate-600">
            Targeting {calorieTarget.toLocaleString()} calories · minimum protein {needs.minProtein}g · minimum fat{" "}
            {needs.minFat}g
          </p>
        </div>
        <button
          type="button"
          onClick={handleResetDay}
          className="inline-flex items-center gap-2 rounded-2xl border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-200"
        >
          Reset day
        </button>
      </header>

      <div className="space-y-4 rounded-2xl border border-slate-200 bg-white/80 p-4">
        <div className="flex flex-wrap gap-2">
          {dayTypes.map((type) => (
            <button
              key={type.name}
              type="button"
              onClick={() => setDayType(type.name)}
              className={
                dayType === type.name
                  ? "rounded-2xl bg-blue-600 px-4 py-1.5 text-sm font-semibold text-white shadow-sm"
                  : "rounded-2xl border border-slate-200 bg-white px-4 py-1.5 text-sm text-slate-600 hover:border-blue-200"
              }
            >
              {type.name}
            </button>
          ))}
        </div>
        {dayType === "Custom" ? (
          <div className="grid gap-3 md:grid-cols-2">
            <NumberField
              label="Base calories"
              value={customDay.baseCalories}
              min={1000}
              max={5000}
              step={50}
              suffix="kcal"
              onChange={(value) => handleCustomDayChange("baseCalories", value)}
            />
            <NumberField
              label="Calorie deficit"
              value={customDay.deficit}
              min={0}
              max={2000}
              step={25}
              suffix="kcal"
              onChange={(value) => handleCustomDayChange("deficit", value)}
            />
          </div>
        ) : null}
      </div>

  <div className="grid gap-4 md:grid-cols-3">
        <ProgressCard title="Protein" value={`${totals.protein.toFixed(0)} g`} percent={percents.protein} />
        <ProgressCard title="Fat" value={`${totals.fat.toFixed(0)} g`} percent={percents.fat} />
        <ProgressCard
          title="Calories"
          value={`${calories.toFixed(0)} kcal`}
          percent={percents.calories}
          helper={`${remainingCalories.toFixed(0)} kcal remaining`}
        />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white/80 p-4">
        <h3 className="text-base font-semibold text-slate-900">Log macros</h3>
        <div className="mt-3 grid gap-3 md:grid-cols-4">
          <NumberField
            label="Protein (g)"
            value={Number(newEntry.protein) || 0}
            min={0}
            max={500}
            step={5}
            onChange={(value) => setNewEntry((prev) => ({ ...prev, protein: String(value) }))}
          />
          <NumberField
            label="Carbs (g)"
            value={Number(newEntry.carbs) || 0}
            min={0}
            max={500}
            step={5}
            onChange={(value) => setNewEntry((prev) => ({ ...prev, carbs: String(value) }))}
          />
          <NumberField
            label="Fat (g)"
            value={Number(newEntry.fat) || 0}
            min={0}
            max={200}
            step={2}
            onChange={(value) => setNewEntry((prev) => ({ ...prev, fat: String(value) }))}
          />
          <div>
            <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Notes</label>
            <input
              type="text"
              value={newEntry.notes}
              onChange={(event) => setNewEntry((prev) => ({ ...prev, notes: event.target.value }))}
              placeholder="Meal or context"
              className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>
        </div>
        <button
          type="button"
          onClick={handleAddEntry}
          className="mt-3 inline-flex items-center justify-center rounded-2xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
        >
          Add entry
        </button>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white/80 p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-900">Today&apos;s entries</h3>
          <p className="text-sm text-slate-500">{entries.length} logged</p>
        </div>
        {entries.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">No meals logged yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-200">
            {entries.map((entry) => {
              const entryCalories = entry.protein * 4 + entry.carbs * 4 + entry.fat * 9;
              return (
                <li key={entry.id} className="flex flex-col gap-1 py-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {entry.protein}P / {entry.carbs}C / {entry.fat}F • {entryCalories} kcal
                    </p>
                    <p className="text-xs text-slate-500">
                      {entry.timestamp}
                      {entry.notes ? ` • ${entry.notes}` : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteEntry(entry.id)}
                    className="self-start rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-600 transition hover:border-red-200 hover:text-red-600"
                  >
                    Remove
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}

function ProgressCard({
  title,
  value,
  percent,
  helper,
}: {
  title: string;
  value: string;
  percent: number;
  helper?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white/80 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
      {helper ? <p className="text-xs text-slate-500">{helper}</p> : null}
      <div className="mt-3 h-2 w-full rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-blue-500 transition-[width]"
          style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
        />
      </div>
      <p className="mt-1 text-xs text-slate-500">{Math.round(Math.min(100, Math.max(0, percent)))}% of target</p>
    </div>
  );
}

function NumberField({
  label,
  value,
  min,
  max,
  step,
  suffix,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix?: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block text-xs font-medium uppercase tracking-wide text-slate-500">
      {label}
      <div className="mt-1 flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2">
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          inputMode="decimal"
          value={Number.isFinite(value) ? value : 0}
          onChange={(event) => {
            const next = event.target.valueAsNumber;
            if (Number.isNaN(next)) return;
            onChange(Math.min(Math.max(next, min), max));
          }}
          className="w-full appearance-none bg-transparent text-right text-base text-slate-900 focus:outline-none"
        />
        {suffix ? <span className="text-slate-500 text-xs">{suffix}</span> : null}
      </div>
    </label>
  );
}

function percentage(value: number, target: number) {
  if (!target || target <= 0) return 0;
  return (value / target) * 100;
}
