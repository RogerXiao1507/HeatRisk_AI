"use client";

import { useMemo, useState } from "react";

type DailyRow = {
  forecast_date: string;
  heatrisk_score: number;
  severity_tier: string;
  heat_index_f?: number | null;
  max_temp_f?: number | null;
  min_temp_f?: number | null;
  relative_humidity_pct?: number | null;
  aqi?: number | null;
  aqi_category?: string | null;
  svi_pct?: number | null;
  heat_contrib?: number | null;
  aqi_contrib?: number | null;
  svi_contrib?: number | null;
  ml_score?: number | null;
  ml_alert_flag?: number | null;
};

type ApiResponse = {
  county: string;
  state_abbr: string;
  peak_day: string;
  peak_score: number;
  peak_tier: string;
  briefing: string;
  ml_model_name?: string | null;
  ml_threshold?: number | null;
  daily_rows: DailyRow[];
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function fmt(value?: number | null, digits = 1) {
  if (value === null || value === undefined || Number.isNaN(value)) return "N/A";
  return value.toFixed(digits);
}

function fmtWhole(value?: number | null) {
  if (value === null || value === undefined || Number.isNaN(value)) return "N/A";
  return Math.round(value).toString();
}

function fmtPct(value?: number | null, digits = 1) {
  if (value === null || value === undefined || Number.isNaN(value)) return "N/A";
  return `${(value * 100).toFixed(digits)}%`;
}

function displayHeatIndex(
  heatIndex?: number | null,
  maxTemp?: number | null
) {
  if (heatIndex !== null && heatIndex !== undefined && !Number.isNaN(heatIndex)) {
    return `${fmt(heatIndex)}°F`;
  }

  if (maxTemp !== null && maxTemp !== undefined && maxTemp < 80) {
    return "Not applicable";
  }

  return "Unavailable";
}

function tierBadge(tier?: string | null) {
  const t = (tier || "").toLowerCase();

  if (t === "critical") {
    return "border-red-500/30 bg-red-500/15 text-red-200";
  }
  if (t === "high") {
    return "border-orange-500/30 bg-orange-500/15 text-orange-200";
  }
  if (t === "moderate") {
    return "border-yellow-500/30 bg-yellow-500/15 text-yellow-200";
  }
  return "border-emerald-500/30 bg-emerald-500/15 text-emerald-200";
}

function riskBar(tier?: string | null) {
  const t = (tier || "").toLowerCase();

  if (t === "critical") return "bg-red-400";
  if (t === "high") return "bg-orange-400";
  if (t === "moderate") return "bg-yellow-400";
  return "bg-emerald-400";
}

function getRiskDriversTitle(tier?: string | null) {
  const t = (tier || "").toLowerCase();

  if (t === "low") return "This county is not currently at elevated heat risk";
  if (t === "moderate") return "Why this county may be at risk";
  return "Why this county is at risk";
}

function getRiskDriversDescription(tier?: string | null) {
  const t = (tier || "").toLowerCase();

  if (t === "low") {
    return "Current forecast conditions do not suggest elevated heat danger. These inputs explain why risk remains limited.";
  }
  if (t === "moderate") {
    return "Some forecast conditions could raise concern. These inputs show what is contributing to the current outlook.";
  }
  return "Risk contribution breakdown for the highest scoring day.";
}

function SectionHeader({
  index,
  title,
  description,
}: {
  index: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="mb-6 flex items-start gap-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-cyan-400/20 bg-cyan-400/10 text-sm font-semibold text-cyan-200">
        {index}
      </div>
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-white">{title}</h2>
        {description ? (
          <p className="mt-2 max-w-3xl text-sm leading-7 text-neutral-400">
            {description}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper?: string;
}) {
  return (
    <div className="glass-panel hover-lift rounded-[1.75rem] p-5">
      <div className="text-sm text-neutral-400">{label}</div>
      <div className="mt-3 text-2xl font-semibold tracking-tight text-white">
        {value}
      </div>
      {helper ? <div className="mt-2 text-sm text-neutral-500">{helper}</div> : null}
    </div>
  );
}

function ScoreRing({
  score,
  label,
  tone,
}: {
  score: number;
  label: string;
  tone: "cyan" | "orange";
}) {
  const pct = Math.max(0, Math.min(score, 100));
  const color = tone === "cyan" ? "#67e8f9" : "#fb923c";

  return (
    <div className="flex flex-col items-center">
      <div
        className="relative flex h-28 w-28 items-center justify-center rounded-full"
        style={{
          background: `conic-gradient(${color} ${pct * 3.6}deg, rgba(255,255,255,0.08) 0deg)`,
        }}
      >
        <div className="surface-panel flex h-[5.9rem] w-[5.9rem] items-center justify-center rounded-full">
          <div className="text-center">
            <div className="text-2xl font-semibold text-white">{Math.round(score)}</div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-neutral-500">
              /100
            </div>
          </div>
        </div>
      </div>
      <div className="mt-3 text-sm text-neutral-400">{label}</div>
    </div>
  );
}

export default function Home() {
  const [stateAbbr, setStateAbbr] = useState("TX");
  const [countyName, setCountyName] = useState("Bexar County");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState<ApiResponse | null>(null);

  const rows = useMemo(() => {
    if (!data?.daily_rows) return [];
    return [...data.daily_rows].sort(
      (a, b) =>
        new Date(a.forecast_date).getTime() - new Date(b.forecast_date).getTime()
    );
  }, [data]);

  const peakRow = useMemo(() => {
    if (!rows.length) return null;
    return [...rows].sort((a, b) => b.heatrisk_score - a.heatrisk_score)[0];
  }, [rows]);

  async function runHeatRisk() {
    setLoading(true);
    setError("");

    try {
      const safeState = encodeURIComponent(stateAbbr.trim().toUpperCase());
      const safeCounty = encodeURIComponent(countyName.trim());

      const res = await fetch(`/api/score/${safeState}/${safeCounty}`, {
        method: "GET",
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.detail || "Request failed");
      }

      setData(json as ApiResponse);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Something went wrong";
      setError(message);
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-7xl px-5 py-6 sm:px-8 sm:py-8">
        <header className="glass-panel sticky top-4 z-20 rounded-full px-5 py-3">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-sm font-semibold tracking-wide text-white">
                HeatRisk AI
              </div>
              <div className="text-xs text-neutral-400">
                County heat intelligence platform
              </div>
            </div>

            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs text-emerald-200">
              <span className="h-2 w-2 rounded-full bg-emerald-300" />
              Forecast services online
            </div>
          </div>
        </header>

        <section className="pt-10">
          <div className="glass-panel overflow-hidden rounded-[2rem] p-6 sm:p-8 lg:p-10">
            <div className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr]">
              <div>
                <div className="inline-flex rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-xs font-medium tracking-[0.15em] text-cyan-200">
                  PUBLIC HEALTH HEAT INTELLIGENCE
                </div>

                <h1 className="mt-5 max-w-4xl text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl">
                  See heat risk before it becomes a crisis
                </h1>

                <p className="mt-5 max-w-2xl text-base leading-8 text-neutral-300 sm:text-lg">
                  HeatRisk AI forecasts county level heat danger using live weather,
                  air quality, social vulnerability, and historical pattern matching.
                </p>

                <div className="mt-8 grid gap-4 sm:grid-cols-3">
                  <StatCard
                    label="Forecast horizon"
                    value="72 hours"
                    helper="Three day county outlook"
                  />
                  <StatCard
                    label="Risk drivers"
                    value="Heat + AQI + SVI"
                    helper="Environmental and community inputs"
                  />
                  <StatCard
                    label="Historical layer"
                    value="Past event match"
                    helper="Compares forecasts to real past heat emergencies"
                  />
                </div>
              </div>

              <div className="surface-panel rounded-[1.75rem] p-5 sm:p-6">
                <div className="text-sm font-medium text-neutral-300">
                  Run a county forecast
                </div>

                <div className="mt-6 space-y-4">
                  <div>
                    <label className="mb-2 block text-sm text-neutral-400">
                      State abbreviation
                    </label>
                    <input
                      value={stateAbbr}
                      onChange={(e) => setStateAbbr(e.target.value)}
                      placeholder="TX"
                      className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white transition focus:border-cyan-400/40"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm text-neutral-400">
                      County name
                    </label>
                    <input
                      value={countyName}
                      onChange={(e) => setCountyName(e.target.value)}
                      placeholder="Bexar County"
                      className="w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white transition focus:border-cyan-400/40"
                    />
                  </div>

                  <button
                    onClick={runHeatRisk}
                    disabled={loading}
                    className="w-full rounded-2xl bg-white px-5 py-3.5 text-base font-semibold text-black transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loading ? "Running forecast..." : "Run HeatRisk"}
                  </button>

                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm leading-7 text-neutral-400">
                    Enter a county and state to compare the overall heat danger
                    score with the forecast&apos;s similarity to real past heat emergencies.
                  </div>

                  {error ? (
                    <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
                      {error}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </section>

        {data ? (
          <div className="mt-8 space-y-8">
            <section className="glass-panel rounded-[2rem] p-6 sm:p-8">
              <SectionHeader
                index="01"
                title="Peak risk summary"
                description="The highest projected county heat danger across the next three days."
              />

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <StatCard
                  label="County"
                  value={`${data.county}, ${data.state_abbr}`}
                  helper="Current forecast target"
                />
                <StatCard
                  label="Peak day"
                  value={data.peak_day}
                  helper="Highest projected risk"
                />
                <div className="glass-panel hover-lift rounded-[1.75rem] p-5">
                  <div className="text-sm text-neutral-400">Peak HeatRisk score</div>
                  <div className="mt-3 text-2xl font-semibold text-white">
                    {fmt(data.peak_score)}
                  </div>
                  <div
                    className={cx(
                      "mt-3 inline-flex rounded-full border px-3 py-1 text-xs font-medium",
                      tierBadge(data.peak_tier)
                    )}
                  >
                    {data.peak_tier}
                  </div>
                </div>
                <StatCard
                  label="Historical model"
                  value={data.ml_model_name || "N/A"}
                  helper={`Trigger level ${data.ml_threshold !== null && data.ml_threshold !== undefined ? fmtPct(data.ml_threshold, 0) : "N/A"}`}
                />
              </div>
            </section>

            <section className="grid gap-8 xl:grid-cols-[1.15fr_0.85fr]">
              <div className="glass-panel rounded-[2rem] p-6 sm:p-8">
                <SectionHeader
                  index="02"
                  title="What decision makers need to know"
                  description="This is the narrative summary generated from the current three day county forecast."
                />
                <div className="whitespace-pre-line text-[15px] leading-8 text-neutral-200">
                  {data.briefing}
                </div>
              </div>

              <div className="glass-panel rounded-[2rem] p-6 sm:p-8">
                <SectionHeader
                  index="03"
                  title="Forecast summary at a glance"
                  description="Overall county heat danger and how much the peak day resembles a past heat emergency."
                />

                <div className="grid gap-8 sm:grid-cols-2">
                  <ScoreRing
                    score={peakRow?.heatrisk_score ?? 0}
                    label="HeatRisk score"
                    tone="orange"
                  />
                  <ScoreRing
                    score={(peakRow?.ml_score ?? 0) * 100}
                    label="Historical event match"
                    tone="cyan"
                  />
                </div>

                <div className="mt-8 grid gap-4 sm:grid-cols-2">
                  <div className="surface-panel rounded-2xl p-4">
                    <div className="text-xs uppercase tracking-[0.18em] text-neutral-500">
                      Heat index
                    </div>
                    <div className="mt-2 text-xl font-semibold text-white">
                      {displayHeatIndex(peakRow?.heat_index_f, peakRow?.max_temp_f)}
                    </div>
                  </div>
                  <div className="surface-panel rounded-2xl p-4">
                    <div className="text-xs uppercase tracking-[0.18em] text-neutral-500">
                      AQI
                    </div>
                    <div className="mt-2 text-xl font-semibold text-white">
                      {peakRow?.aqi !== null && peakRow?.aqi !== undefined
                        ? fmtWhole(peakRow.aqi)
                        : "N/A"}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="glass-panel rounded-[2rem] p-6 sm:p-8">
              <SectionHeader
                index="04"
                title="Risk across the forecast window"
                description="Compare the county HeatRisk score with the historical event match for each day."
              />

              <div className="grid gap-4 lg:grid-cols-3">
                {rows.map((row) => {
                  const matchPct =
                    row.ml_score !== null && row.ml_score !== undefined
                      ? row.ml_score * 100
                      : 0;

                  return (
                    <div
                      key={row.forecast_date}
                      className="surface-panel hover-lift rounded-[1.75rem] p-5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm text-neutral-500">Forecast day</div>
                          <div className="mt-1 text-xl font-semibold text-white">
                            {row.forecast_date}
                          </div>
                        </div>
                        <div
                          className={cx(
                            "inline-flex rounded-full border px-3 py-1 text-xs font-medium",
                            tierBadge(row.severity_tier)
                          )}
                        >
                          {row.severity_tier}
                        </div>
                      </div>

                      <div className="mt-6 space-y-4">
                        <div>
                          <div className="mb-2 flex items-center justify-between text-sm">
                            <span className="text-neutral-400">HeatRisk score</span>
                            <span className="font-medium text-white">
                              {fmt(row.heatrisk_score)}
                            </span>
                          </div>
                          <div className="h-3 rounded-full bg-white/5">
                            <div
                              className={cx("h-3 rounded-full", riskBar(row.severity_tier))}
                              style={{ width: `${Math.min(row.heatrisk_score, 100)}%` }}
                            />
                          </div>
                        </div>

                        <div>
                          <div className="mb-2 flex items-center justify-between text-sm">
                            <span className="text-neutral-400">Historical event match</span>
                            <span className="font-medium text-white">
                              {row.ml_score !== null && row.ml_score !== undefined
                                ? fmtPct(row.ml_score, 1)
                                : "N/A"}
                            </span>
                          </div>
                          <div className="h-3 rounded-full bg-white/5">
                            <div
                              className="h-3 rounded-full bg-cyan-400"
                              style={{ width: `${Math.min(matchPct, 100)}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="mt-6 grid grid-cols-2 gap-3">
                        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                          <div className="text-xs uppercase tracking-wide text-neutral-500">
                            Heat index
                          </div>
                          <div className="mt-1 font-medium text-white">
                            {displayHeatIndex(row.heat_index_f, row.max_temp_f)}
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                          <div className="text-xs uppercase tracking-wide text-neutral-500">
                            Max temp
                          </div>
                          <div className="mt-1 font-medium text-white">
                            {row.max_temp_f !== null && row.max_temp_f !== undefined
                              ? `${fmt(row.max_temp_f)}°F`
                              : "N/A"}
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                          <div className="text-xs uppercase tracking-wide text-neutral-500">
                            AQI
                          </div>
                          <div className="mt-1 font-medium text-white">
                            {row.aqi !== null && row.aqi !== undefined
                              ? fmtWhole(row.aqi)
                              : "N/A"}
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                          <div className="text-xs uppercase tracking-wide text-neutral-500">
                            Emergency pattern trigger
                          </div>
                          <div className="mt-1 font-medium text-white">
                            {row.ml_alert_flag === 1 ? "Yes" : "No"}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="grid gap-8 xl:grid-cols-[0.95fr_1.05fr]">
              <div className="glass-panel rounded-[2rem] p-6 sm:p-8">
                <SectionHeader
                  index="05"
                  title={getRiskDriversTitle(data.peak_tier)}
                  description={getRiskDriversDescription(data.peak_tier)}
                />

                <div className="space-y-5">
                  {[
                    {
                      label: "Heat contribution",
                      value: peakRow?.heat_contrib ?? 0,
                      tone: "bg-orange-400",
                    },
                    {
                      label: "Air quality contribution",
                      value: peakRow?.aqi_contrib ?? 0,
                      tone: "bg-cyan-400",
                    },
                    {
                      label: "Vulnerability contribution",
                      value: peakRow?.svi_contrib ?? 0,
                      tone: "bg-violet-400",
                    },
                  ].map((item) => (
                    <div key={item.label}>
                      <div className="mb-2 flex items-center justify-between text-sm">
                        <span className="text-neutral-300">{item.label}</span>
                        <span className="font-medium text-white">
                          {fmt(item.value)}
                        </span>
                      </div>
                      <div className="h-3 rounded-full bg-white/5">
                        <div
                          className={cx("h-3 rounded-full", item.tone)}
                          style={{ width: `${Math.min(item.value, 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-8 grid gap-4 sm:grid-cols-2">
                  <div className="surface-panel rounded-2xl p-4">
                    <div className="text-xs uppercase tracking-[0.18em] text-neutral-500">
                      Heat index
                    </div>
                    <div className="mt-2 text-xl font-semibold text-white">
                      {displayHeatIndex(peakRow?.heat_index_f, peakRow?.max_temp_f)}
                    </div>
                  </div>

                  <div className="surface-panel rounded-2xl p-4">
                    <div className="text-xs uppercase tracking-[0.18em] text-neutral-500">
                      AQI
                    </div>
                    <div className="mt-2 text-xl font-semibold text-white">
                      {peakRow?.aqi !== null && peakRow?.aqi !== undefined
                        ? fmtWhole(peakRow.aqi)
                        : "N/A"}
                    </div>
                  </div>

                  <div className="surface-panel rounded-2xl p-4">
                    <div className="text-xs uppercase tracking-[0.18em] text-neutral-500">
                      Max temperature
                    </div>
                    <div className="mt-2 text-xl font-semibold text-white">
                      {peakRow?.max_temp_f !== null && peakRow?.max_temp_f !== undefined
                        ? `${fmt(peakRow.max_temp_f)}°F`
                        : "N/A"}
                    </div>
                  </div>

                  <div className="surface-panel rounded-2xl p-4">
                    <div className="text-xs uppercase tracking-[0.18em] text-neutral-500">
                      SVI percentile
                    </div>
                    <div className="mt-2 text-xl font-semibold text-white">
                      {peakRow?.svi_pct !== null && peakRow?.svi_pct !== undefined
                        ? `${fmt(peakRow.svi_pct)}%`
                        : "N/A"}
                    </div>
                  </div>
                </div>
              </div>

              <div className="glass-panel rounded-[2rem] p-6 sm:p-8">
                <SectionHeader
                  index="06"
                  title="Historical heat event match"
                  description="This score shows how closely each forecast day resembles a real past heat emergency day from our historical data."
                />

                <div className="rounded-[1.5rem] border border-cyan-400/15 bg-cyan-400/5 p-5">
                  <div className="text-sm text-neutral-400">Current model</div>
                  <div className="mt-1 text-xl font-semibold text-white">
                    {data.ml_model_name || "N/A"}
                  </div>
                  <div className="mt-3 text-sm leading-7 text-neutral-300">
                    The emergency pattern trigger turns on when a day&apos;s historical
                    event match rises above the current trigger level of{" "}
                    <span className="font-semibold text-white">
                      {data.ml_threshold !== null && data.ml_threshold !== undefined
                        ? fmtPct(data.ml_threshold, 0)
                        : "N/A"}
                    </span>
                    .
                  </div>
                </div>

                <div className="mt-5 space-y-3">
                  {rows.map((row) => (
                    <div
                      key={`hist-${row.forecast_date}`}
                      className="surface-panel rounded-2xl p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="text-sm text-neutral-400">{row.forecast_date}</div>
                          <div className="mt-1 text-base font-medium text-white">
                            {row.ml_alert_flag === 1
                              ? "Emergency pattern trigger: Yes"
                              : "Emergency pattern trigger: No"}
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-sm text-neutral-400">
                            Historical event match
                          </div>
                          <div className="mt-1 text-lg font-semibold text-white">
                            {row.ml_score !== null && row.ml_score !== undefined
                              ? fmtPct(row.ml_score, 1)
                              : "N/A"}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="glass-panel rounded-[2rem] p-6 sm:p-8">
              <SectionHeader
                index="07"
                title="Detailed forecast data"
                description="Raw daily metrics for technical users and demo judges."
              />

              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="border-b border-white/10 text-neutral-400">
                    <tr>
                      <th className="px-3 py-3 font-medium">Date</th>
                      <th className="px-3 py-3 font-medium">HeatRisk</th>
                      <th className="px-3 py-3 font-medium">Tier</th>
                      <th className="px-3 py-3 font-medium">Event match</th>
                      <th className="px-3 py-3 font-medium">Trigger</th>
                      <th className="px-3 py-3 font-medium">Heat index</th>
                      <th className="px-3 py-3 font-medium">Max temp</th>
                      <th className="px-3 py-3 font-medium">AQI</th>
                      <th className="px-3 py-3 font-medium">SVI %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={`table-${row.forecast_date}`} className="border-b border-white/5">
                        <td className="px-3 py-3">{row.forecast_date}</td>
                        <td className="px-3 py-3">{fmt(row.heatrisk_score)}</td>
                        <td className="px-3 py-3">{row.severity_tier}</td>
                        <td className="px-3 py-3">
                          {row.ml_score !== null && row.ml_score !== undefined
                            ? fmtPct(row.ml_score, 1)
                            : "N/A"}
                        </td>
                        <td className="px-3 py-3">
                          {row.ml_alert_flag === 1 ? "Yes" : "No"}
                        </td>
                        <td className="px-3 py-3">
                          {displayHeatIndex(row.heat_index_f, row.max_temp_f)}
                        </td>
                        <td className="px-3 py-3">
                          {row.max_temp_f !== null && row.max_temp_f !== undefined
                            ? `${fmt(row.max_temp_f)}°F`
                            : "N/A"}
                        </td>
                        <td className="px-3 py-3">
                          {row.aqi !== null && row.aqi !== undefined
                            ? fmtWhole(row.aqi)
                            : "N/A"}
                        </td>
                        <td className="px-3 py-3">
                          {row.svi_pct !== null && row.svi_pct !== undefined
                            ? `${fmt(row.svi_pct)}%`
                            : "N/A"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="glass-panel rounded-[2rem] p-6 sm:p-8">
              <SectionHeader
                index="08"
                title="Understanding the forecast"
                description="These terms help explain how the county risk score is built."
              />

              <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
                <div className="surface-panel rounded-[1.5rem] p-5">
                  <div className="text-lg font-semibold text-white">HeatRisk score</div>
                  <p className="mt-3 text-sm leading-7 text-neutral-300">
                    An overall county heat danger score based on forecast heat,
                    air quality, and community vulnerability.
                  </p>
                </div>

                <div className="surface-panel rounded-[1.5rem] p-5">
                  <div className="text-lg font-semibold text-white">AQI</div>
                  <p className="mt-3 text-sm leading-7 text-neutral-300">
                    AQI stands for Air Quality Index. Higher AQI means worse air
                    quality, which can make hot conditions more dangerous.
                  </p>
                </div>

                <div className="surface-panel rounded-[1.5rem] p-5">
                  <div className="text-lg font-semibold text-white">SVI</div>
                  <p className="mt-3 text-sm leading-7 text-neutral-300">
                    SVI stands for Social Vulnerability Index. It reflects how
                    vulnerable a community may be based on social and economic conditions.
                  </p>
                </div>

                <div className="surface-panel rounded-[1.5rem] p-5">
                  <div className="text-lg font-semibold text-white">Heat index</div>
                  <p className="mt-3 text-sm leading-7 text-neutral-300">
                    Heat index is the feels like temperature based on heat and
                    humidity. On cooler days it may be shown as not applicable.
                  </p>
                </div>

                <div className="surface-panel rounded-[1.5rem] p-5">
                  <div className="text-lg font-semibold text-white">
                    Historical event match
                  </div>
                  <p className="mt-3 text-sm leading-7 text-neutral-300">
                    Shows how much the forecast resembles real past heat emergency
                    days from our historical training data.
                  </p>
                </div>

                <div className="surface-panel rounded-[1.5rem] p-5">
                  <div className="text-lg font-semibold text-white">
                    Emergency pattern trigger
                  </div>
                  <p className="mt-3 text-sm leading-7 text-neutral-300">
                    A yes or no signal that turns on only when the forecast strongly
                    matches past emergency heat patterns.
                  </p>
                </div>
              </div>
            </section>
          </div>
        ) : null}
      </div>
    </main>
  );
}