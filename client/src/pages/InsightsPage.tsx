import { AlertCircle, ArrowUpRight, Info } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { Link, useSearchParams } from 'react-router';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useBreakdown, useDistribution, useMeta, useSummary } from '../api/hooks';
import type { Breakdown, BreakdownRow, GroupBy, Summary } from '../api/types';
import { PageHeader } from '../components/PageHeader';
import { formatMoney, formatNumber, formatPercent } from '../lib/format';

const GROUP_LABELS: Record<GroupBy, string> = { country: 'Country', department: 'Department', jobTitle: 'Job title' };
const ALL = '__all__';

export function InsightsPage() {
  const [params, setParams] = useSearchParams();
  const country = params.get('country') ?? undefined;
  const requestedGroup = (params.get('groupBy') as GroupBy | null) ?? 'country';
  // Grouping by country inside a single country is pointless; fall back to department.
  const groupBy: GroupBy = country && requestedGroup === 'country' ? 'department' : requestedGroup;

  const setParam = (key: string, value: string | undefined) =>
    setParams((current) => {
      const next = new URLSearchParams(current);
      if (value) next.set(key, value);
      else next.delete(key);
      return next;
    });

  const { data: meta } = useMeta();
  const summary = useSummary(country);
  const breakdown = useBreakdown(groupBy, country);
  const distribution = useDistribution(country);
  const countryName = meta?.countries.find((c) => c.code === country)?.name;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pay insights"
        description={`How ${countryName ? `ACME pays people in ${countryName}` : 'ACME pays people'} — base annual salary.`}
        actions={
          <Select value={country ?? ALL} onValueChange={(v) => setParam('country', v === ALL ? undefined : v)}>
            <SelectTrigger className="w-48" aria-label="Scope to country">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All countries</SelectItem>
              {meta?.countries.map((c) => (
                <SelectItem key={c.code} value={c.code}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      {summary.error && (
        <Alert variant="destructive">
          <AlertCircle />
          <AlertDescription>{summary.error.message}</AlertDescription>
        </Alert>
      )}
      <SummaryCards summary={summary.data} />

      <Card>
        <CardHeader>
          <CardTitle>Pay by {GROUP_LABELS[groupBy].toLowerCase()}</CardTitle>
          <CardDescription>
            <CurrencyNote breakdown={breakdown.data} />
          </CardDescription>
          <CardAction>
            <ToggleGroup
              type="single"
              variant="outline"
              size="sm"
              value={groupBy}
              onValueChange={(v) => v && setParam('groupBy', v)}
              aria-label="Group by"
            >
              {(Object.keys(GROUP_LABELS) as GroupBy[])
                .filter((g) => !(country && g === 'country'))
                .map((g) => (
                  <ToggleGroupItem key={g} value={g} className="px-3">
                    {GROUP_LABELS[g]}
                  </ToggleGroupItem>
                ))}
            </ToggleGroup>
          </CardAction>
        </CardHeader>
        <CardContent className="space-y-6">
          {breakdown.data ? <BreakdownView breakdown={breakdown.data} /> : <Skeleton className="h-80" />}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Salary distribution</CardTitle>
          <CardDescription>
            Employees per salary band{distribution.data ? ` (${distribution.data.currency})` : ''}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {distribution.data ? (
            <DistributionChart currency={distribution.data.currency} buckets={distribution.data.buckets} />
          ) : (
            <Skeleton className="h-64" />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryCards({ summary }: { summary?: Summary }) {
  if (!summary) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
    );
  }
  const currency = summary.currency ?? 'USD';
  const stats = summary.stats;
  const cards = [
    {
      label: 'Headcount',
      value: formatNumber(summary.headcount),
      footer: `${summary.countries} ${summary.countries === 1 ? 'country' : 'countries'} · ${summary.departments} departments`,
    },
    {
      label: 'Median salary',
      value: stats ? formatMoney(stats.median, currency) : '—',
      footer: 'Half earn more, half earn less',
    },
    {
      label: 'Middle 50% earn',
      value: stats
        ? `${formatMoney(stats.p25, currency, { compact: true })} – ${formatMoney(stats.p75, currency, { compact: true })}`
        : '—',
      footer: '25th to 75th percentile',
    },
    {
      label: 'Annual payroll',
      value: summary.totalPayroll !== undefined ? formatMoney(summary.totalPayroll, currency, { compact: true }) : '—',
      footer: stats ? `Mean salary ${formatMoney(stats.mean, currency)}` : '',
    },
  ];
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.label} className="gap-2">
          <CardHeader>
            <CardDescription>{card.label}</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums">{card.value}</CardTitle>
          </CardHeader>
          <CardFooter className="text-sm text-muted-foreground">{card.footer}</CardFooter>
        </Card>
      ))}
    </div>
  );
}

function isMixedCurrency(breakdown: Breakdown): boolean {
  return new Set(breakdown.rows.map((r) => r.currency)).size > 1;
}

function CurrencyNote({ breakdown }: { breakdown?: Breakdown }) {
  if (!breakdown) return <>&nbsp;</>;
  const mixed = isMixedCurrency(breakdown);
  const text = mixed
    ? 'Each country in its own currency; the chart compares medians in USD.'
    : !breakdown.country
      ? 'Cross-country figures normalised to USD.'
      : `Figures in ${breakdown.rows[0]?.currency ?? ''}.`;
  return (
    <span className="inline-flex items-center gap-1">
      {text}
      <Tooltip>
        <TooltipTrigger asChild>
          <button type="button" aria-label="About currency conversion" className="text-muted-foreground">
            <Info className="size-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent className="max-w-72">
          USD conversions use fixed reference rates ({breakdown.fxRatesVersion}) so comparisons are stable and
          reproducible. They are not payment rates.
        </TooltipContent>
      </Tooltip>
    </span>
  );
}

/** Link to the employee directory filtered to this group (from a number to the people behind it). */
function drillDownLink(breakdown: Breakdown, row: BreakdownRow): string {
  const params = new URLSearchParams();
  if (breakdown.country) params.set('country', breakdown.country);
  params.set(breakdown.groupBy, row.key);
  params.set('sort', 'salary');
  params.set('order', 'desc');
  return `/employees?${params}`;
}

const medianChartConfig = { median: { label: 'Median', color: 'var(--chart-2)' } } satisfies ChartConfig;

function BreakdownView({ breakdown }: { breakdown: Breakdown }) {
  const mixed = isMixedCurrency(breakdown);
  const chartCurrency = mixed ? 'USD' : (breakdown.rows[0]?.currency ?? 'USD');
  const chartData = breakdown.rows.map((r) => ({ group: r.label, median: mixed ? r.medianUsd : r.stats.median }));

  return (
    <>
      <ChartContainer
        config={medianChartConfig}
        className="aspect-auto w-full"
        style={{ height: Math.max(220, breakdown.rows.length * 30) }}
      >
        <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 16 }}>
          <CartesianGrid horizontal={false} />
          <YAxis dataKey="group" type="category" tickLine={false} axisLine={false} width={190} tickMargin={8} />
          <XAxis
            type="number"
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => formatMoney(v, chartCurrency, { compact: true })}
          />
          <ChartTooltip
            cursor={false}
            content={
              <ChartTooltipContent
                formatter={(value) => (
                  <span className="font-mono font-medium tabular-nums">
                    Median {formatMoney(Number(value), chartCurrency)}
                  </span>
                )}
              />
            }
          />
          <Bar dataKey="median" fill="var(--color-median)" radius={4} isAnimationActive={false} />
        </BarChart>
      </ChartContainer>

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>{GROUP_LABELS[breakdown.groupBy]}</TableHead>
              <TableHead className="text-right">Headcount</TableHead>
              <TableHead className="text-right">Min</TableHead>
              <TableHead className="text-right">25th pct</TableHead>
              <TableHead className="text-right">Median</TableHead>
              <TableHead className="text-right">75th pct</TableHead>
              <TableHead className="text-right">Max</TableHead>
              <TableHead className="text-right">Mean</TableHead>
              {mixed && <TableHead className="text-right">Median (USD)</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {breakdown.rows.map((row) => {
              const money = (v: number) => formatMoney(v, row.currency);
              return (
                <TableRow key={row.key}>
                  <TableCell>
                    <Link
                      to={drillDownLink(breakdown, row)}
                      className="group inline-flex items-center gap-1 font-medium hover:underline"
                    >
                      {row.label}
                      <ArrowUpRight className="size-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                    </Link>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatNumber(row.headcount)}{' '}
                    <span className="text-xs text-muted-foreground">({formatPercent(row.headcountShare)})</span>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{money(row.stats.min)}</TableCell>
                  <TableCell className="text-right tabular-nums">{money(row.stats.p25)}</TableCell>
                  <TableCell className="text-right font-medium tabular-nums">{money(row.stats.median)}</TableCell>
                  <TableCell className="text-right tabular-nums">{money(row.stats.p75)}</TableCell>
                  <TableCell className="text-right tabular-nums">{money(row.stats.max)}</TableCell>
                  <TableCell className="text-right tabular-nums">{money(row.stats.mean)}</TableCell>
                  {mixed && (
                    <TableCell className="text-right tabular-nums">{formatMoney(row.medianUsd, 'USD')}</TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </>
  );
}

const distributionChartConfig = { employees: { label: 'Employees', color: 'var(--chart-2)' } } satisfies ChartConfig;

function DistributionChart({
  currency,
  buckets,
}: {
  currency: string;
  buckets: { from: number; to: number; count: number }[];
}) {
  const data = buckets.map((b) => ({
    band: formatMoney(b.from, currency, { compact: true }),
    range: `${formatMoney(b.from, currency, { compact: true })} – ${formatMoney(b.to, currency, { compact: true })}`,
    employees: b.count,
  }));
  return (
    <ChartContainer config={distributionChartConfig} className="aspect-auto h-64 w-full">
      <BarChart data={data} margin={{ left: -8 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="band" tickLine={false} axisLine={false} tickMargin={8} minTickGap={16} />
        <YAxis tickLine={false} axisLine={false} width={48} />
        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent
              labelFormatter={(_, payload) => payload?.[0]?.payload?.range ?? ''}
              formatter={(value) => (
                <span className="font-mono font-medium tabular-nums">{formatNumber(Number(value))} employees</span>
              )}
            />
          }
        />
        <Bar dataKey="employees" fill="var(--color-employees)" radius={[4, 4, 0, 0]} isAnimationActive={false} />
      </BarChart>
    </ChartContainer>
  );
}
