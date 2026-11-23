import { BarChart } from '@mantine/charts';
import {
  Alert,
  Anchor,
  Card,
  Group,
  SegmentedControl,
  Select,
  SimpleGrid,
  Skeleton,
  Stack,
  Table,
  Text,
  Title,
  Tooltip,
} from '@mantine/core';
import { IconInfoCircle } from '@tabler/icons-react';
import { Link, useSearchParams } from 'react-router';
import { useBreakdown, useDistribution, useMeta, useSummary } from '../api/hooks';
import type { Breakdown, BreakdownRow, GroupBy } from '../api/types';
import { formatMoney, formatNumber, formatPercent } from '../lib/format';

const GROUP_LABELS: Record<GroupBy, string> = { country: 'Country', department: 'Department', jobTitle: 'Job title' };

export function InsightsPage() {
  const [params, setParams] = useSearchParams();
  const country = params.get('country') ?? undefined;
  const requestedGroup = (params.get('groupBy') as GroupBy | null) ?? 'country';
  // Grouping by country inside a single country is pointless; fall back to department.
  const groupBy: GroupBy = country && requestedGroup === 'country' ? 'department' : requestedGroup;

  const setParam = (key: string, value: string | null) =>
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

  const groupOptions = (Object.keys(GROUP_LABELS) as GroupBy[])
    .filter((g) => !(country && g === 'country'))
    .map((g) => ({ value: g, label: GROUP_LABELS[g] }));

  return (
    <Stack>
      <Group justify="space-between" align="flex-end">
        <div>
          <Title order={2}>Pay insights</Title>
          <Text c="dimmed" size="sm">
            How ACME pays people — base annual salary.
          </Text>
        </div>
        <Select
          placeholder="All countries"
          clearable
          searchable
          data={meta?.countries.map((c) => ({ value: c.code, label: c.name })) ?? []}
          value={country ?? null}
          onChange={(v) => setParam('country', v)}
          w={220}
          aria-label="Scope to country"
        />
      </Group>

      {summary.error && <Alert color="red">{summary.error.message}</Alert>}
      <SummaryCards summary={summary.data} />

      <Card withBorder>
        <Group justify="space-between" mb="md" wrap="wrap">
          <div>
            <Title order={4}>Pay by {GROUP_LABELS[groupBy].toLowerCase()}</Title>
            <CurrencyNote breakdown={breakdown.data} />
          </div>
          <SegmentedControl data={groupOptions} value={groupBy} onChange={(v) => setParam('groupBy', v)} />
        </Group>
        {breakdown.data ? <BreakdownView breakdown={breakdown.data} /> : <Skeleton h={300} />}
      </Card>

      <Card withBorder>
        <Title order={4}>Salary distribution</Title>
        <Text size="sm" c="dimmed" mb="md">
          Number of employees per salary band{distribution.data ? ` (${distribution.data.currency})` : ''}.
        </Text>
        {distribution.data ? (
          <BarChart
            h={260}
            data={distribution.data.buckets.map((b) => ({
              band: formatMoney(b.from, distribution.data.currency, { compact: true }),
              employees: b.count,
            }))}
            dataKey="band"
            series={[{ name: 'employees', label: 'Employees', color: 'indigo.5' }]}
            tickLine="y"
            barProps={{ radius: [3, 3, 0, 0] }}
          />
        ) : (
          <Skeleton h={260} />
        )}
      </Card>
    </Stack>
  );
}

function SummaryCards({ summary }: { summary: ReturnType<typeof useSummary>['data'] }) {
  if (!summary) {
    return (
      <SimpleGrid cols={{ base: 2, md: 4 }}>
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} h={92} />
        ))}
      </SimpleGrid>
    );
  }
  const currency = summary.currency ?? 'USD';
  const stats = summary.stats;
  const cards = [
    {
      label: 'Headcount',
      value: formatNumber(summary.headcount),
      hint: `${summary.countries} countries · ${summary.departments} departments`,
    },
    { label: 'Median salary', value: stats ? formatMoney(stats.median, currency) : '—', hint: 'Half earn more, half less' },
    {
      label: 'Middle 50% earn',
      value: stats
        ? `${formatMoney(stats.p25, currency, { compact: true })} – ${formatMoney(stats.p75, currency, { compact: true })}`
        : '—',
      hint: '25th to 75th percentile',
    },
    {
      label: 'Annual payroll',
      value: summary.totalPayroll !== undefined ? formatMoney(summary.totalPayroll, currency, { compact: true }) : '—',
      hint: stats ? `Mean salary ${formatMoney(stats.mean, currency)}` : '',
    },
  ];
  return (
    <SimpleGrid cols={{ base: 1, xs: 2, md: 4 }}>
      {cards.map((card) => (
        <Card key={card.label} withBorder>
          <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
            {card.label}
          </Text>
          <Text fz={24} fw={700}>
            {card.value}
          </Text>
          <Text size="xs" c="dimmed">
            {card.hint}
          </Text>
        </Card>
      ))}
    </SimpleGrid>
  );
}

function isMixedCurrency(breakdown: Breakdown): boolean {
  return new Set(breakdown.rows.map((r) => r.currency)).size > 1;
}

function CurrencyNote({ breakdown }: { breakdown?: Breakdown }) {
  if (!breakdown) return null;
  const mixed = isMixedCurrency(breakdown);
  return (
    <Group gap={4}>
      <Text size="sm" c="dimmed">
        {mixed
          ? 'Each country in its own currency; chart compares medians in USD.'
          : breakdown.rows.some((r) => r.currency === 'USD') && !breakdown.country
            ? 'Cross-country figures normalised to USD.'
            : `Figures in ${breakdown.rows[0]?.currency ?? ''}.`}
      </Text>
      <Tooltip
        multiline
        w={280}
        label={`USD conversions use fixed reference rates (${breakdown.fxRatesVersion}) so comparisons are stable and reproducible. They are not payment rates.`}
      >
        <IconInfoCircle size={14} style={{ opacity: 0.6 }} />
      </Tooltip>
    </Group>
  );
}

/** Link to the employee directory filtered to this group (drill-down from a number to the people behind it). */
function drillDownLink(breakdown: Breakdown, row: BreakdownRow): string {
  const params = new URLSearchParams();
  if (breakdown.country) params.set('country', breakdown.country);
  params.set(breakdown.groupBy, row.key);
  params.set('sort', 'salary');
  params.set('order', 'desc');
  return `/employees?${params}`;
}

function BreakdownView({ breakdown }: { breakdown: Breakdown }) {
  const mixed = isMixedCurrency(breakdown);
  const chartCurrency = mixed ? 'USD' : (breakdown.rows[0]?.currency ?? 'USD');
  const chartData = breakdown.rows.map((r) => ({
    group: r.label,
    median: mixed ? r.medianUsd : r.stats.median,
  }));

  return (
    <Stack>
      <BarChart
        h={Math.max(220, breakdown.rows.length * 28)}
        data={chartData}
        dataKey="group"
        orientation="vertical"
        yAxisProps={{ width: 190 }}
        valueFormatter={(v) => formatMoney(v, chartCurrency, { compact: true })}
        series={[{ name: 'median', label: `Median (${chartCurrency})`, color: 'indigo.6' }]}
        gridAxis="x"
        barProps={{ radius: [0, 3, 3, 0] }}
      />
      <Table.ScrollContainer minWidth={900}>
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>{GROUP_LABELS[breakdown.groupBy]}</Table.Th>
              <Table.Th ta="right">Headcount</Table.Th>
              <Table.Th ta="right">Min</Table.Th>
              <Table.Th ta="right">25th pct</Table.Th>
              <Table.Th ta="right">Median</Table.Th>
              <Table.Th ta="right">75th pct</Table.Th>
              <Table.Th ta="right">Max</Table.Th>
              <Table.Th ta="right">Mean</Table.Th>
              {mixed && <Table.Th ta="right">Median (USD)</Table.Th>}
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {breakdown.rows.map((row) => {
              const money = (v: number) => formatMoney(v, row.currency);
              return (
                <Table.Tr key={row.key}>
                  <Table.Td>
                    <Anchor component={Link} to={drillDownLink(breakdown, row)} size="sm">
                      {row.label}
                    </Anchor>
                  </Table.Td>
                  <Table.Td ta="right">
                    {formatNumber(row.headcount)}{' '}
                    <Text span size="xs" c="dimmed">
                      ({formatPercent(row.headcountShare)})
                    </Text>
                  </Table.Td>
                  <Table.Td ta="right">{money(row.stats.min)}</Table.Td>
                  <Table.Td ta="right">{money(row.stats.p25)}</Table.Td>
                  <Table.Td ta="right" fw={600}>
                    {money(row.stats.median)}
                  </Table.Td>
                  <Table.Td ta="right">{money(row.stats.p75)}</Table.Td>
                  <Table.Td ta="right">{money(row.stats.max)}</Table.Td>
                  <Table.Td ta="right">{money(row.stats.mean)}</Table.Td>
                  {mixed && <Table.Td ta="right">{formatMoney(row.medianUsd, 'USD')}</Table.Td>}
                </Table.Tr>
              );
            })}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>
    </Stack>
  );
}
