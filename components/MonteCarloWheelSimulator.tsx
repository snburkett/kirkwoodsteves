'use client';

import { type ReactNode, useMemo, useState } from "react";

const TRADING_DAYS = 252;
const CONTRACT_SIZE = 100;
const OPTION_INTERVALS = {
  weekly: 5,
  monthly: 21,
  quarterly: 63,
} as const;
const MIN_PRICE = 0.01;

type OptionCadence = keyof typeof OPTION_INTERVALS;

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const percentFormatter = new Intl.NumberFormat("en-US", {
  style: "percent",
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
});

interface MonteCarloParams {
  startPrice: number;
  drift: number;
  volatility: number;
  volatilityMultiplier: number;
  numPaths: number;
  optionDays: number;
  premiumPercent: number;
  otmPercent: number;
  seed?: number;
}

interface PricePath {
  open: number[];
  close: number[];
}

interface WheelResult {
  values: number[];
  assignments: number;
  totalPremium: number;
  optionSales: number;
}

interface SimulationSummary {
  samplePath: PricePath;
  avgBuyHoldPath: number[];
  avgWheelPath: number[];
  buyHoldFinalMean: number;
  wheelFinalMean: number;
  wheelWinRate: number;
  avgAssignments: number;
  avgPremium: number;
  avgOptionSales: number;
}

export default function MonteCarloWheelSimulator() {
  const [startPrice, setStartPrice] = useState(100);
  const [drift, setDrift] = useState(0.12);
  const [volatility, setVolatility] = useState(0.28);
  const [volatilityMultiplier, setVolatilityMultiplier] = useState(1.1);
  const [numPaths, setNumPaths] = useState(200);
  const [optionCadence, setOptionCadence] = useState<OptionCadence>("monthly");
  const [premiumPercent, setPremiumPercent] = useState(0.02);
  const [otmPercent, setOtmPercent] = useState(0.05);
  const [runId, setRunId] = useState(() => Math.floor(Math.random() * 1_000_000));

  const simulation = useMemo(() => {
    return runMonteCarlo({
      startPrice,
      drift,
      volatility,
      volatilityMultiplier,
      numPaths,
      optionDays: OPTION_INTERVALS[optionCadence],
      premiumPercent,
      otmPercent,
      seed: runId,
    });
  }, [
    startPrice,
    drift,
    volatility,
    volatilityMultiplier,
    numPaths,
    optionCadence,
    premiumPercent,
    otmPercent,
    runId,
  ]);

  if (!simulation) {
    return null;
  }

  return (
    <section className="space-y-8 rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm ring-1 ring-inset ring-black/5">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm uppercase tracking-wide text-slate-500">Oddities lab</p>
          <h3 className="text-2xl font-semibold text-slate-900">Buy & hold versus the wheel</h3>
          <p className="text-sm text-slate-600">
            {numPaths} Monte Carlo paths · {OPTION_INTERVALS[optionCadence]} trading-day options · contract size{" "}
            {CONTRACT_SIZE} shares.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setRunId((id) => id + 1)}
          className="inline-flex items-center justify-center rounded-2xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400"
        >
          Run Monte Carlo
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <ParameterBlock title="Stock behavior">
          <NumberField
            label="Starting price"
            suffix="$"
            value={startPrice}
            min={20}
            max={1000}
            step={1}
            onChange={(value) => setStartPrice(clamp(value, 20, 1000))}
          />
          <NumberField
            label="Annual drift"
            suffix="%"
            value={drift * 100}
            min={-40}
            max={40}
            step={0.1}
            onChange={(value) => setDrift(clamp(value, -40, 40) / 100)}
          />
          <NumberField
            label="Annual volatility"
            suffix="%"
            value={volatility * 100}
            min={0.5}
            max={80}
            step={0.1}
            onChange={(value) => setVolatility(clamp(value, 0.5, 80) / 100)}
          />
          <NumberField
            label="Volatility multiplier"
            value={volatilityMultiplier}
            min={0.4}
            max={2}
            step={0.05}
            onChange={(value) => setVolatilityMultiplier(clamp(value, 0.4, 2))}
          />
        </ParameterBlock>

        <ParameterBlock title="Wheel settings">
          <SelectField label="Option cadence" value={optionCadence} onChange={setOptionCadence}>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
          </SelectField>
          <NumberField
            label="Premium % of underlying"
            suffix="%"
            value={premiumPercent * 100}
            min={0.3}
            max={15}
            step={0.1}
            onChange={(value) => setPremiumPercent(clamp(value, 0.3, 15) / 100)}
          />
          <NumberField
            label="Target OTM"
            suffix="%"
            value={otmPercent * 100}
            min={-15}
            max={25}
            step={0.5}
            onChange={(value) => setOtmPercent(clamp(value, -15, 25) / 100)}
            helper="Negative is ITM."
          />
        </ParameterBlock>

        <ParameterBlock title="Simulation">
          <NumberField
            label="Paths"
            value={numPaths}
            min={10}
            max={800}
            step={10}
            onChange={(value) => setNumPaths(Math.round(clamp(value, 10, 800)))}
            helper="More paths smooths the averages."
          />
          <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 text-sm text-slate-600">
            <p>
              Generating daily open/close prices with a geometric Brownian motion tuned by drift, volatility, and your
              multiplier.
            </p>
            <p className="mt-2">
              The wheel alternates cash-secured puts and covered calls with your premium and moneyness inputs.
            </p>
          </div>
        </ParameterBlock>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Mean finish — buy & hold" value={formatCurrency(simulation.buyHoldFinalMean)} />
        <StatCard label="Mean finish — wheel" value={formatCurrency(simulation.wheelFinalMean)} />
        <StatCard
          label="Wheel win rate"
          value={percentFormatter.format(simulation.wheelWinRate)}
          trend={
            simulation.wheelFinalMean >= simulation.buyHoldFinalMean
              ? "Wheel led on average"
              : "Buy & hold led on average"
          }
        />
        <StatCard
          label="Average assignments"
          value={simulation.avgAssignments.toFixed(1)}
          trend={`${percentFormatter.format(simulation.avgAssignments / Math.max(simulation.avgOptionSales, 1))} of option sales`}
        />
        <StatCard
          label="Average premium harvested"
          value={formatCurrency(simulation.avgPremium)}
          trend="Across the simulated year"
        />
        <StatCard label="Option sales per path" value={simulation.avgOptionSales.toFixed(1)} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartPanel
          title="Sample price path"
          description="Daily opens and closes for one of the simulated paths."
          legend={[
            { name: "Open", color: "#fb7185" },
            { name: "Close", color: "#2563eb" },
          ]}
        >
          <LineChart
            series={[
              { id: "open", color: "#fb7185", values: simulation.samplePath.open },
              { id: "close", color: "#2563eb", values: simulation.samplePath.close },
            ]}
            valueFormatter={(value) => formatCurrency(value * CONTRACT_SIZE)}
          />
        </ChartPanel>

        <ChartPanel
          title="Average portfolio value"
          description="Mean ending value across all Monte Carlo paths."
          legend={[
            { name: "Buy & hold", color: "#0ea5e9" },
            { name: "Wheel strategy", color: "#9333ea" },
          ]}
        >
          <LineChart
            series={[
              { id: "buyHold", color: "#0ea5e9", values: simulation.avgBuyHoldPath },
              { id: "wheel", color: "#9333ea", values: simulation.avgWheelPath },
            ]}
            valueFormatter={(value) => formatCurrency(value)}
          />
        </ChartPanel>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-sm leading-relaxed text-slate-700">
        <p>
          Buy & hold here starts with {CONTRACT_SIZE} shares and simply lets them ride. The wheel starts in cash,
          collects premiums immediately, and only takes assignment when price crosses the targeted strike at option
          expiry. Premiums compound into cash that cushions drawdowns but the strategy can trail in strong uptrends when
          covered calls cap the upside.
        </p>
        <p className="mt-2">
          Use the controls above to dial the personality of the stock or the aggressiveness of the options. Wider OTM and
          leaner premiums start to favor buy & hold; richer premiums or more frequent expiries tilt toward the wheel.
        </p>
      </div>
    </section>
  );
}

function runMonteCarlo(params: MonteCarloParams): SimulationSummary | null {
  const safePaths = Math.max(1, Math.floor(params.numPaths));
  const baseSeed = params.seed ?? Date.now();
  const pricePaths: PricePath[] = [];
  const buyHoldSeriesList: number[][] = [];
  const wheelSeriesList: number[][] = [];
  const buyHoldFinals: number[] = [];
  const wheelFinals: number[] = [];
  const assignmentCounts: number[] = [];
  const premiumTotals: number[] = [];
  const optionSales: number[] = [];

  for (let i = 0; i < safePaths; i += 1) {
    const rng = createRng(baseSeed + i * 997);
    const path = generatePricePath(params, rng);
    pricePaths.push(path);
    const buyHoldSeries = path.close.map((price) => price * CONTRACT_SIZE);
    buyHoldSeriesList.push(buyHoldSeries);
    const wheelOutcome = simulateWheelStrategy(path.close, params);
    wheelSeriesList.push(wheelOutcome.values);
    buyHoldFinals.push(buyHoldSeries[buyHoldSeries.length - 1]);
    wheelFinals.push(wheelOutcome.values[wheelOutcome.values.length - 1]);
    assignmentCounts.push(wheelOutcome.assignments);
    premiumTotals.push(wheelOutcome.totalPremium);
    optionSales.push(wheelOutcome.optionSales);
  }

  const avgBuyHoldPath = averageSeries(buyHoldSeriesList);
  const avgWheelPath = averageSeries(wheelSeriesList);
  const wheelWins = wheelFinals.filter((value, index) => value > buyHoldFinals[index]).length;

  return {
    samplePath: pricePaths[0],
    avgBuyHoldPath,
    avgWheelPath,
    buyHoldFinalMean: average(buyHoldFinals),
    wheelFinalMean: average(wheelFinals),
    wheelWinRate: wheelWins / safePaths,
    avgAssignments: average(assignmentCounts),
    avgPremium: average(premiumTotals),
    avgOptionSales: average(optionSales),
  };
}

function generatePricePath(params: MonteCarloParams, rng: () => number): PricePath {
  const { startPrice, drift, volatility, volatilityMultiplier } = params;
  const dt = 1 / TRADING_DAYS;
  const effectiveVol = volatility * volatilityMultiplier;
  const mu = (drift - 0.5 * effectiveVol * effectiveVol) * dt;
  const sigma = effectiveVol * Math.sqrt(dt);
  let price = Math.max(startPrice, MIN_PRICE);
  const opens: number[] = [];
  const closes: number[] = [];

  for (let day = 0; day < TRADING_DAYS; day += 1) {
    const openPrice = price;
    const closePrice = Math.max(openPrice * Math.exp(mu + sigma * randomNormal(rng)), MIN_PRICE);
    opens.push(openPrice);
    closes.push(closePrice);
    price = closePrice;
  }

  return { open: opens, close: closes };
}

function randomNormal(rng: () => number) {
  let u = 0;
  let v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

function simulateWheelStrategy(prices: number[], params: MonteCarloParams): WheelResult {
  const { startPrice, optionDays, premiumPercent, otmPercent } = params;
  if (prices.length === 0) {
    return { values: [], assignments: 0, totalPremium: 0, optionSales: 0 };
  }

  const initialPrice = Math.max(startPrice, MIN_PRICE);
  let cash = initialPrice * CONTRACT_SIZE;
  let shares = 0;
  let optionType: "put" | "call" = "put";
  let strike = computeStrike(initialPrice, optionType, otmPercent);
  let daysUntilExpiry = optionDays;
  let assignments = 0;
  let totalPremium = 0;
  let optionSales = 0;

  const values: number[] = new Array(prices.length);

  function openOption(price: number) {
    optionType = shares > 0 ? "call" : "put";
    strike = computeStrike(price, optionType, otmPercent);
    const premium = price * premiumPercent * CONTRACT_SIZE;
    totalPremium += premium;
    cash += premium;
    daysUntilExpiry = optionDays;
    optionSales += 1;
  }

  // initial option sale occurs before the first trading day.
  openOption(initialPrice);

  for (let day = 0; day < prices.length; day += 1) {
    const price = prices[day];
    daysUntilExpiry -= 1;
    const optionExpired = daysUntilExpiry <= 0;

    if (optionExpired) {
      if (optionType === "put") {
        if (shares === 0 && price <= strike) {
          cash -= strike * CONTRACT_SIZE;
          shares = CONTRACT_SIZE;
          assignments += 1;
        }
      } else {
        if (shares > 0 && price >= strike) {
          cash += strike * CONTRACT_SIZE;
          shares = 0;
          assignments += 1;
        }
      }

      if (day < prices.length - 1) {
        openOption(price);
      }
    }

    values[day] = cash + shares * price;
  }

  return { values, assignments, totalPremium, optionSales };
}

function computeStrike(price: number, type: "put" | "call", otm: number) {
  const factor = type === "call" ? 1 + otm : 1 - otm;
  return Math.max(price * factor, MIN_PRICE);
}

function averageSeries(seriesList: number[][]) {
  if (seriesList.length === 0) {
    return [];
  }
  const length = seriesList[0].length;
  const totals = new Array(length).fill(0);

  for (const series of seriesList) {
    for (let i = 0; i < length; i += 1) {
      totals[i] += series[i];
    }
  }

  return totals.map((total) => total / seriesList.length);
}

function average(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function createRng(seed: number) {
  let state = Math.floor(seed) || 1;
  return () => {
    state += 0x6d2b79f5;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function formatCurrency(value: number) {
  return currencyFormatter.format(value);
}

function ParameterBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-3 rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm">
      <p className="text-sm font-medium uppercase tracking-wide text-slate-500">{title}</p>
      <div className="space-y-3">{children}</div>
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
  helper,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix?: string;
  helper?: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block text-sm font-medium text-slate-600">
      <span>{label}</span>
      <div className="mt-1 flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2">
        {suffix === "$" ? <span className="text-slate-500">$</span> : null}
        <input
          type="number"
          inputMode="decimal"
          value={Number.isFinite(value) ? value : 0}
          min={min}
          max={max}
          step={step}
          onChange={(event) => {
            const next = event.target.valueAsNumber;
            if (Number.isNaN(next)) return;
            onChange(next);
          }}
          className="w-full appearance-none bg-transparent text-right text-base text-slate-900 focus:outline-none"
        />
        {suffix && suffix !== "$" ? <span className="text-slate-500">{suffix}</span> : null}
      </div>
      {helper ? <p className="mt-1 text-xs text-slate-500">{helper}</p> : null}
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: OptionCadence;
  onChange: (value: OptionCadence) => void;
  children: ReactNode;
}) {
  return (
    <label className="block text-sm font-medium text-slate-600">
      <span>{label}</span>
      <select
        className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-base text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
        value={value}
        onChange={(event) => onChange(event.target.value as OptionCadence)}
      >
        {children}
      </select>
    </label>
  );
}

function StatCard({ label, value, trend }: { label: string; value: string; trend?: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p>
      {trend ? <p className="mt-1 text-xs text-slate-500">{trend}</p> : null}
    </div>
  );
}

function ChartPanel({
  title,
  description,
  legend,
  children,
}: {
  title: string;
  description: string;
  legend: Array<{ name: string; color: string }>;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm">
      <div>
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <p className="text-xs text-slate-500">{description}</p>
      </div>
      <div className="flex flex-wrap gap-3 text-xs font-medium text-slate-600">
        {legend.map((item) => (
          <span key={item.name} className="inline-flex items-center gap-2">
            <span className="h-2.5 w-6 rounded-full" style={{ backgroundColor: item.color }} />
            {item.name}
          </span>
        ))}
      </div>
      <div className="min-h-[220px]">{children}</div>
    </div>
  );
}

function LineChart({
  series,
  valueFormatter,
  height = 220,
}: {
  series: Array<{ id: string; values: number[]; color: string }>;
  valueFormatter?: (value: number) => string;
  height?: number;
}) {
  if (series.length === 0 || series.every((item) => item.values.length === 0)) {
    return <div className="text-sm text-slate-500">No data to display.</div>;
  }

  const length = Math.max(...series.map((s) => s.values.length));
  if (length === 0) {
    return <div className="text-sm text-slate-500">No data to display.</div>;
  }

  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  for (const s of series) {
    for (const value of s.values) {
      if (value < min) min = value;
      if (value > max) max = value;
    }
  }
  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    return <div className="text-sm text-slate-500">No data to display.</div>;
  }
  if (max === min) {
    max += 1;
    min -= 1;
  }

  const width = 720;
  const xForIndex = (index: number) => {
    if (length === 1) return width / 2;
    return (index / (length - 1)) * (width - 40) + 20;
  };
  const yForValue = (value: number) => {
    const normalized = (value - min) / (max - min);
    return height - normalized * (height - 20) - 10;
  };

  const gridLines = 4;
  const ticks = generateMonthTicks(length);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full text-slate-500">
      {[...Array(gridLines + 1)].map((_, index) => {
        const y = (index / gridLines) * (height - 20) + 10;
        const value = max - (index / gridLines) * (max - min);
        return (
          <g key={`grid-${index}`}>
            <line x1={20} x2={width - 20} y1={y} y2={y} stroke="#e2e8f0" strokeDasharray="4 4" />
            <text x={width - 10} y={y - 2} textAnchor="end" fontSize={10}>
              {valueFormatter ? valueFormatter(value) : value.toFixed(0)}
            </text>
          </g>
        );
      })}
      {series.map((line) => {
        const d = line.values
          .map((value, index) => {
            const x = xForIndex(index);
            const y = yForValue(value);
            return `${index === 0 ? "M" : "L"} ${x} ${y}`;
          })
          .join(" ");
        return <path key={line.id} d={d} fill="none" stroke={line.color} strokeWidth={2.5} strokeLinecap="round" />;
      })}
      {ticks.map((tick) => {
        const x = xForIndex(tick.index);
        return (
          <g key={tick.label}>
            <line x1={x} x2={x} y1={height - 20} y2={height - 14} stroke="#cbd5f5" />
            <text x={x} y={height - 2} textAnchor="middle" fontSize={10}>
              {tick.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function generateMonthTicks(length: number) {
  const monthLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const spacing = Math.max(1, Math.floor(length / monthLabels.length));
  return monthLabels.map((label, index) => ({
    label,
    index: Math.min(length - 1, index * spacing),
  }));
}
