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

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function formatNumber(value?: number | null, digits = 1) {
  if (value === null || value === undefined || Number.isNaN(value)) return "N/A";
  return value.toFixed(digits);
}

function formatWhole(value?: number | null) {
  if (value === null || value === undefined || Number.isNaN(value)) return "N/A";
  return Math.round(value).toString();
}

function formatPercent(value?: number | null, digits = 1) {
  if (value === null || value === undefined || Number.isNaN(value)) return "N/A";
  return `${(value * 100).toFixed(digits)}%`;
}

function tierBadgeClasses(tier?: string | null) {
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

function riskBarColor(tier?: string | null) {
  const t = (tier || "").toLowerCase();

  if (t === "critical") return "bg-red-400";
  if (t === "high") return "bg-orange-400";
  if (t === "moderate") return "bg-yellow-400";
  return "bg-emerald-400";
}

function SectionTitle({
  eyebrow,
  title,
  description,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="max-w-3xl">
      {eyebrow ? (
        <div className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-cyan-300/80">
          {eyebrow}
        </div>
      ) : null}
      <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
        {title}
      </h2>
      {description ? (
        <p className="mt-3 text-sm leading-7 text-neutral-400 sm:text-base">
          {description}
        </p>
      ) : null}
    </div>
  );
}

function StatCard({
  label,
  value,
  subtext,
}: {
  label: string;
  value: string;
  subtext?: string;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.01)]">
      <div className="text-sm text-neutral-400">{label}</div>
      <div className="mt-3 text-2xl font-semibold tracking-tight text-white">
        {value}
      </div>
      {subtext ? <div className="mt-2 text-sm text-neutral-500">{subtext}</div> : null}
    </div>
  );
}

export default function Home() {
  const [stateAbbr, setStateAbbr] = useState("TX");
  const [countyName, setCountyName] = useState("Bexar County");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState<ApiResponse | null>(null);

  const sortedRows = useMemo(() => {
    if (!data?.daily_rows) return [];
    return [...data.daily_rows].sort(
      (a, b) =>
        new Date(a.forecast_date).getTime() - new Date(b.forecast_date).getTime()
    );
  }, [data]);

  const peakRow = useMemo(() => {
    if (!sortedRows.length) return null;
    return [...sortedRows].sort((a, b) => b.heatrisk_score - a.heatrisk_score)[0];
  }, [sortedRows]);

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
    <main className="min-h-screen bg-[#05070b] text-white">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-0 h-[32rem] w-[32rem] -translate-x-1/2 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute right-0 top-40 h-[24rem] w-[24rem] rounded-full bg-blue-500/10 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-6 py-8 sm:px-8 sm:py-12">
        <section className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-6 shadow-2xl shadow-black/30 backdrop-blur sm:p-8">
          <div className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr]">
            <div>
              <div className="inline-flex rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-xs font-medium tracking-wide text-cyan-200">
                Public Health Heat Intelligence
              </div>

              <h1 className="mt-5 max-w-3xl text-5xl font-semibold tracking-tight text-white sm:text-6xl">
                HeatRisk AI
              </h1>

              <p className="mt-5 max-w-3xl text-lg leading-8 text-neutral-300">
                Forecast county heat risk using live weather, air quality,
                social vulnerability, and a trained ML event likelihood model.
              </p>

              <div className="mt-8 grid gap-4 sm:grid-cols-3">
                <StatCard
                  label="Forecast horizon"
                  value="72 hours"
                  subtext="Three day county outlook"
                />
                <StatCard
                  label="Risk drivers"
                  value="Heat + AQI + SVI"
                  subtext="Environmental and community factors"
                />
                <StatCard
                  label="ML layer"
                  value="Historical event similarity"
                  subtext="Trained on historical county day heat events"
                />
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-white/10 bg-[#0a0e14] p-5 sm:p-6">
              <div className="text-sm font-medium text-neutral-300">
                Run a county level forecast
              </div>

              <div className="mt-6 grid gap-4">
                <div>
                  <label className="mb-2 block text-sm text-neutral-400">
                    State abbreviation
                  </label>
                  <input
                    value={stateAbbr}
                    onChange={(e) => setStateAbbr(e.target.value)}
                    placeholder="TX"
                    className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none transition focus:border-cyan-400/50"
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
                    className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none transition focus:border-cyan-400/50"
                  />
                </div>

                <button
                  onClick={runHeatRisk}
                  disabled={loading}
                  className="mt-2 rounded-2xl bg-white px-5 py-3.5 text-base font-semibold text-black transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "Running forecast..." : "Run HeatRisk"}
                </button>

                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm leading-7 text-neutral-400">
                  Search any supported US county and compare the rule based
                  HeatRisk score with the ML event likelihood signal.
                </div>
              </div>
            </div>
          </div>

          {error ? (
            <div className="mt-6 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          ) : null}
        </section>

        {data ? (
          <div className="mt-8 grid gap-8">
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <StatCard
                label="County"
                value={`${data.county}, ${data.state_abbr}`}
                subtext="Current forecast target"
              />
              <StatCard
                label="Peak day"
                value={data.peak_day}
                subtext="Highest projected risk day"
              />
              <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
                <div className="text-sm text-neutral-400">Peak HeatRisk score</div>
                <div className="mt-3 text-2xl font-semibold tracking-tight text-white">
                  {formatNumber(data.peak_score)}
                </div>
                <div
                  className={cn(
                    "mt-3 inline-flex rounded-full border px-3 py-1 text-xs font-medium",
                    tierBadgeClasses(data.peak_tier)
                  )}
                >
                  {data.peak_tier}
                </div>
              </div>
              <StatCard
                label="ML model"
                value={data.ml_model_name || "N/A"}
                subtext={`Threshold ${data.ml_threshold !== null && data.ml_threshold !== undefined ? formatNumber(data.ml_threshold, 2) : "N/A"}`}
              />
            </section>

            <section className="grid gap-8 xl:grid-cols-[1.15fr_0.85fr]">
              <div className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-6 sm:p-8">
                <SectionTitle
                  eyebrow="Executive Briefing"
                  title="What decision makers need to know"
                  description="This is the narrative summary generated from the current three day county forecast."
                />
                <div className="mt-6 whitespace-pre-line text-[15px] leading-8 text-neutral-200">
                  {data.briefing}
                </div>
              </div>

              <div className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-6 sm:p-8">
                <SectionTitle
                  eyebrow="Peak Day Diagnostics"
                  title="Why this county is at risk"
                  description="Risk contribution breakdown for the highest scoring day."
                />

                <div className="mt-6 space-y-5">
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
                          {formatNumber(item.value)}
                        </span>
                      </div>
                      <div className="h-3 rounded-full bg-white/5">
                        <div
                          className={cn("h-3 rounded-full", item.tone)}
                          style={{ width: `${Math.min(item.value, 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-8 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl border border-white/10 bg-[#0a0e14] p-4">
                    <div className="text-xs uppercase tracking-[0.18em] text-neutral-500">
                      Heat index
                    </div>
                    <div className="mt-2 text-xl font-semibold text-white">
                      {peakRow?.heat_index_f !== null &&
                      peakRow?.heat_index_f !== undefined
                        ? `${formatNumber(peakRow.heat_index_f)}°F`
                        : "N/A"}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-[#0a0e14] p-4">
                    <div className="text-xs uppercase tracking-[0.18em] text-neutral-500">
                      AQI
                    </div>
                    <div className="mt-2 text-xl font-semibold text-white">
                      {peakRow?.aqi !== null && peakRow?.aqi !== undefined
                        ? formatWhole(peakRow.aqi)
                        : "N/A"}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-[#0a0e14] p-4">
                    <div className="text-xs uppercase tracking-[0.18em] text-neutral-500">
                      Max temperature
                    </div>
                    <div className="mt-2 text-xl font-semibold text-white">
                      {peakRow?.max_temp_f !== null &&
                      peakRow?.max_temp_f !== undefined
                        ? `${formatNumber(peakRow.max_temp_f)}°F`
                        : "N/A"}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-[#0a0e14] p-4">
                    <div className="text-xs uppercase tracking-[0.18em] text-neutral-500">
                      SVI percentile
                    </div>
                    <div className="mt-2 text-xl font-semibold text-white">
                      {peakRow?.svi_pct !== null && peakRow?.svi_pct !== undefined
                        ? `${formatNumber(peakRow.svi_pct)}%`
                        : "N/A"}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-6 sm:p-8">
              <SectionTitle
                eyebrow="Next 3 Days"
                title="Risk across the forecast window"
                description="Compare overall HeatRisk with the ML event likelihood for each day."
              />

              <div className="mt-8 grid gap-4 lg:grid-cols-3">
                {sortedRows.map((row) => {
                  const mlPct =
                    row.ml_score !== null && row.ml_score !== undefined
                      ? row.ml_score * 100
                      : 0;

                  return (
                    <div
                      key={row.forecast_date}
                      className="rounded-[1.75rem] border border-white/10 bg-[#0a0e14] p-5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm text-neutral-500">Forecast day</div>
                          <div className="mt-1 text-xl font-semibold text-white">
                            {row.forecast_date}
                          </div>
                        </div>

                        <div
                          className={cn(
                            "inline-flex rounded-full border px-3 py-1 text-xs font-medium",
                            tierBadgeClasses(row.severity_tier)
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
                              {formatNumber(row.heatrisk_score)}
                            </span>
                          </div>
                          <div className="h-3 rounded-full bg-white/5">
                            <div
                              className={cn("h-3 rounded-full", riskBarColor(row.severity_tier))}
                              style={{ width: `${Math.min(row.heatrisk_score, 100)}%` }}
                            />
                          </div>
                        </div>

                        <div>
                          <div className="mb-2 flex items-center justify-between text-sm">
                            <span className="text-neutral-400">ML event likelihood</span>
                            <span className="font-medium text-white">
                              {row.ml_score !== null && row.ml_score !== undefined
                                ? formatPercent(row.ml_score, 1)
                                : "N/A"}
                            </span>
                          </div>
                          <div className="h-3 rounded-full bg-white/5">
                            <div
                              className="h-3 rounded-full bg-cyan-400"
                              style={{ width: `${Math.min(mlPct, 100)}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="mt-6 grid grid-cols-2 gap-3 text-sm">
                        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                          <div className="text-neutral-500">Heat index</div>
                          <div className="mt-1 font-medium text-white">
                            {row.heat_index_f !== null && row.heat_index_f !== undefined
                              ? `${formatNumber(row.heat_index_f)}°F`
                              : "N/A"}
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                          <div className="text-neutral-500">Max temp</div>
                          <div className="mt-1 font-medium text-white">
                            {row.max_temp_f !== null && row.max_temp_f !== undefined
                              ? `${formatNumber(row.max_temp_f)}°F`
                              : "N/A"}
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                          <div className="text-neutral-500">AQI</div>
                          <div className="mt-1 font-medium text-white">
                            {row.aqi !== null && row.aqi !== undefined
                              ? formatWhole(row.aqi)
                              : "N/A"}
                          </div>
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                          <div className="text-neutral-500">ML alert</div>
                          <div className="mt-1 font-medium text-white">
                            {row.ml_alert_flag === 1 ? "Triggered" : "Not triggered"}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="grid gap-8 xl:grid-cols-[0.9fr_1.1fr]">
              <div className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-6 sm:p-8">
                <SectionTitle
                  eyebrow="Machine Learning"
                  title="Historical event likelihood"
                  description="The ML model predicts how similar each forecast day is to a real historical county day heat event."
                />

                <div className="mt-6 rounded-[1.5rem] border border-cyan-400/15 bg-cyan-400/5 p-5">
                  <div className="text-sm text-neutral-400">Model</div>
                  <div className="mt-1 text-xl font-semibold text-white">
                    {data.ml_model_name || "N/A"}
                  </div>
                  <div className="mt-3 text-sm leading-7 text-neutral-300">
                    The current alert threshold is{" "}
                    <span className="font-semibold text-white">
                      {data.ml_threshold !== null && data.ml_threshold !== undefined
                        ? formatPercent(data.ml_threshold, 0)
                        : "N/A"}
                    </span>
                    . A day only triggers when the ML score exceeds that level.
                  </div>
                </div>

                <div className="mt-6 space-y-3">
                  {sortedRows.map((row) => (
                    <div
                      key={`ml-${row.forecast_date}`}
                      className="rounded-2xl border border-white/10 bg-[#0a0e14] p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="text-sm text-neutral-400">{row.forecast_date}</div>
                          <div className="mt-1 text-base font-medium text-white">
                            {row.ml_alert_flag === 1 ? "Alert triggered" : "No alert"}
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-sm text-neutral-400">ML score</div>
                          <div className="mt-1 text-lg font-semibold text-white">
                            {row.ml_score !== null && row.ml_score !== undefined
                              ? formatPercent(row.ml_score, 1)
                              : "N/A"}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-6 sm:p-8">
                <SectionTitle
                  eyebrow="Detailed View"
                  title="Forecast data table"
                  description="For technical users who want the raw daily metrics."
                />

                <div className="mt-6 overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="border-b border-white/10 text-neutral-400">
                      <tr>
                        <th className="px-3 py-3 font-medium">Date</th>
                        <th className="px-3 py-3 font-medium">Risk</th>
                        <th className="px-3 py-3 font-medium">Tier</th>
                        <th className="px-3 py-3 font-medium">ML</th>
                        <th className="px-3 py-3 font-medium">Alert</th>
                        <th className="px-3 py-3 font-medium">Heat Index</th>
                        <th className="px-3 py-3 font-medium">Max Temp</th>
                        <th className="px-3 py-3 font-medium">AQI</th>
                        <th className="px-3 py-3 font-medium">SVI %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedRows.map((row) => (
                        <tr
                          key={`table-${row.forecast_date}`}
                          className="border-b border-white/5 text-neutral-200"
                        >
                          <td className="px-3 py-3">{row.forecast_date}</td>
                          <td className="px-3 py-3">{formatNumber(row.heatrisk_score)}</td>
                          <td className="px-3 py-3">{row.severity_tier}</td>
                          <td className="px-3 py-3">
                            {row.ml_score !== null && row.ml_score !== undefined
                              ? formatPercent(row.ml_score, 1)
                              : "N/A"}
                          </td>
                          <td className="px-3 py-3">
                            {row.ml_alert_flag === 1 ? "Yes" : "No"}
                          </td>
                          <td className="px-3 py-3">
                            {row.heat_index_f !== null && row.heat_index_f !== undefined
                              ? `${formatNumber(row.heat_index_f)}°F`
                              : "N/A"}
                          </td>
                          <td className="px-3 py-3">
                            {row.max_temp_f !== null && row.max_temp_f !== undefined
                              ? `${formatNumber(row.max_temp_f)}°F`
                              : "N/A"}
                          </td>
                          <td className="px-3 py-3">
                            {row.aqi !== null && row.aqi !== undefined
                              ? formatWhole(row.aqi)
                              : "N/A"}
                          </td>
                          <td className="px-3 py-3">
                            {row.svi_pct !== null && row.svi_pct !== undefined
                              ? `${formatNumber(row.svi_pct)}%`
                              : "N/A"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>

            <section className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-6 sm:p-8">
              <SectionTitle
                eyebrow="How to Read This"
                title="Rule score versus ML signal"
                description="These two scores answer different questions."
              />

              <div className="mt-6 grid gap-4 lg:grid-cols-2">
                <div className="rounded-[1.5rem] border border-white/10 bg-[#0a0e14] p-5">
                  <div className="text-lg font-semibold text-white">HeatRisk score</div>
                  <p className="mt-3 text-sm leading-7 text-neutral-300">
                    This is the overall projected county heat risk score for the
                    next three days. It is built from heat, air quality, and
                    social vulnerability and is meant for decision support.
                  </p>
                </div>

                <div className="rounded-[1.5rem] border border-white/10 bg-[#0a0e14] p-5">
                  <div className="text-lg font-semibold text-white">ML score</div>
                  <p className="mt-3 text-sm leading-7 text-neutral-300">
                    This score shows how similar a forecast day looks to a real
                    historical heat event pattern the model learned from past
                    county day data. High values suggest the day resembles true
                    historical heat event conditions.
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