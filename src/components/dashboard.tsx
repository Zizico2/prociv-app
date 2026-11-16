'use client';

import { AppShell } from '@astryxdesign/core/AppShell';
import { Banner } from '@astryxdesign/core/Banner';
import { BottomSheet } from '@astryxdesign/core/BottomSheet';
import { Button } from '@astryxdesign/core/Button';
import { Card } from '@astryxdesign/core/Card';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { Heading } from '@astryxdesign/core/Heading';
import { useMediaQuery } from '@astryxdesign/core/hooks';
import { Icon } from '@astryxdesign/core/Icon';
import { Link } from '@astryxdesign/core/Link';
import { List, ListItem } from '@astryxdesign/core/List';
import { Selector } from '@astryxdesign/core/Selector';
import { Stack, StackItem } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';
import { TextInput } from '@astryxdesign/core/TextInput';
import { TopNav, TopNavHeading } from '@astryxdesign/core/TopNav';
import { VisuallyHidden } from '@astryxdesign/core/VisuallyHidden';
import * as stylex from '@stylexjs/stylex';
import type { DehydratedDbState } from '@tanstack/db';
import {
  HydrationBoundary,
  useDbClient,
  useLiveQuery,
} from '@tanstack/react-db';
import {
  Activity,
  Car,
  ChevronRight,
  Flame,
  HeartHandshake,
  List as ListIcon,
  Map,
  MapPin,
  Plane,
  RefreshCw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  TriangleAlert,
  Users,
  X,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { snapshotCollection, snapshotQuery } from '../lib/collections';
import {
  type Category,
  category,
  categoryLabels,
  dateTime,
  filterOccurrences,
  hasPoint,
  natureLabel,
  type Occurrence,
  resourceTotal,
  type Snapshot,
} from '../lib/occurrences';

const OccurrenceMap = dynamic(() => import('./occurrence-map'), {
  ssr: false,
  loading: () => (
    <Stack align="center" justify="center" height="100%">
      <Text color="secondary">A preparar o mapa…</Text>
    </Stack>
  ),
});
const icons = {
  fire: Flame,
  accident: Car,
  assistance: HeartHandshake,
  other: ShieldCheck,
};

export function HydratedDashboard({
  initial,
  state,
}: {
  initial: Snapshot;
  state: DehydratedDbState;
}) {
  return (
    <HydrationBoundary state={state}>
      <Dashboard initial={initial} />
    </HydrationBoundary>
  );
}

export function Dashboard({
  initial,
  loading = false,
}: {
  initial: Snapshot | null;
  loading?: boolean;
}) {
  const db = useDbClient();
  const { data } = useLiveQuery({ query: snapshotQuery() });
  const snapshot = data[0] ?? initial;
  const [search, setSearch] = useState('');
  const [kind, setKind] = useState<Category>('all');
  const [region, setRegion] = useState('');
  const [status, setStatus] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [view, setView] = useState<'map' | 'list'>('map');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [mapWarning, setMapWarning] = useState('');
  const [statusOpen, setStatusOpen] = useState(false);
  const [now, setNow] = useState<number | null>(null);
  const compact = useMediaQuery(
    '(max-width: 767px), (max-width: 1023px) and (max-height: 500px)',
  );
  const rows = snapshot?.occurrences ?? [];
  const filtered = filterOccurrences(rows, search, kind, region, status);
  const selected = filtered.find((r) => r.id === selectedId);
  const activeFilters = Boolean(search || kind !== 'all' || region || status);
  const regions = [
    ...new Set(
      rows.map((r) => r.region).filter((s): s is string => Boolean(s)),
    ),
  ].sort();
  const statuses = [
    ...new Set(
      rows.map((r) => r.groupedStatus).filter((s): s is string => Boolean(s)),
    ),
  ].sort();
  const stale =
    now != null &&
    snapshot != null &&
    (!snapshot.sourceUpdatedAt ||
      now - Date.parse(snapshot.sourceUpdatedAt) > 15 * 60_000);
  useEffect(() => {
    setNow(Date.now());
    setSelectedId(new URLSearchParams(window.location.search).get('oc'));
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    const query =
      db.requireDependency<import('@tanstack/query-core').QueryClient>(
        'queryClient',
      );
    const update = () =>
      setError(
        query.getQueryState(['current-occurrences'])?.status === 'error'
          ? 'A atualização falhou. Mantivemos a última informação disponível.'
          : '',
      );
    update();
    return query.getQueryCache().subscribe(update);
  }, [db]);
  function select(id: string | null) {
    setSelectedId(id);
    const url = new URL(window.location.href);
    if (id) url.searchParams.set('oc', id);
    else url.searchParams.delete('oc');
    window.history.replaceState(null, '', url);
  }
  function reset() {
    setSearch('');
    setKind('all');
    setRegion('');
    setStatus('');
  }
  async function refresh() {
    setRefreshing(true);
    setError('');
    try {
      const collection = db.collection(snapshotCollection);
      await collection.preload();
      await collection.utils.refetch({ throwOnError: true });
    } catch {
      setError(
        'A atualização falhou. Mantivemos a última informação disponível.',
      );
    } finally {
      setRefreshing(false);
    }
  }
  const categoryControls = (
    <Stack
      direction="horizontal"
      gap={2}
      align="center"
      xstyle={styles.categories}
    >
      {(Object.keys(categoryLabels) as Category[]).map((key) => (
        <StackItem key={key} size="static" xstyle={styles.categoryItem}>
          <Button
            label={categoryLabels[key]}
            size="sm"
            variant={kind === key ? 'primary' : 'ghost'}
            aria-pressed={kind === key}
            onClick={() => setKind(key)}
            xstyle={styles.categoryButton}
            icon={
              key !== 'all' ? <Icon icon={icons[key]} size="sm" /> : undefined
            }
          />
        </StackItem>
      ))}
      {activeFilters && (
        <Button
          label="Limpar"
          size="sm"
          variant="ghost"
          onClick={reset}
          xstyle={styles.categoryButton}
        />
      )}
    </Stack>
  );
  const dataWarning =
    error ||
    (stale
      ? 'A fonte está desatualizada. Consulte a hora dos dados antes de interpretar o mapa.'
      : '');
  const warnings = [dataWarning, mapWarning].filter(Boolean);
  const filterControls = (
    <Stack gap={4}>
      <Stack direction="horizontal" align="center" justify="between">
        <Heading level={2}>Pesquisar e filtrar</Heading>
        <Button
          label="Fechar filtros"
          isIconOnly
          icon={<Icon icon={X} />}
          variant="ghost"
          onClick={() => setFiltersOpen(false)}
        />
      </Stack>
      {compact && (
        <>
          <TextInput
            label="Pesquisar ocorrências"
            type="search"
            placeholder="Local ou ocorrência…"
            startIcon={Search}
            value={search}
            onChange={setSearch}
            hasClear
            width="100%"
          />
          <Stack gap={2}>
            <Text type="label">Tipo de ocorrência</Text>
            {categoryControls}
          </Stack>
        </>
      )}
      <Selector
        label="Região"
        value={region}
        onChange={setRegion}
        width="100%"
        options={[
          { value: '', label: 'Todo o continente' },
          ...regions.map((r) => ({ value: r, label: r })),
        ]}
      />
      <Selector
        label="Estado"
        value={status}
        onChange={setStatus}
        width="100%"
        options={[
          { value: '', label: 'Todos os estados' },
          ...statuses.map((s) => ({ value: s, label: s })),
        ]}
      />
      <Text type="supporting" color="secondary">
        Inclui ocorrências em despacho, em curso e nas fases finais, enquanto
        constarem na fonte.
      </Text>
      <Button label="Limpar filtros" variant="ghost" onClick={reset} />
      <Button
        label={
          compact
            ? `Ver ${filtered.length} ${filtered.length === 1 ? 'ocorrência' : 'ocorrências'}`
            : 'Ver resultados'
        }
        variant="primary"
        onClick={() => setFiltersOpen(false)}
      />
    </Stack>
  );
  return (
    <AppShell
      contentPadding={0}
      topNav={
        <TopNav
          label="Pulso"
          heading={
            <TopNavHeading
              as="a"
              heading="pulso."
              headingHref="/"
              logo={<Icon icon={Activity} />}
            />
          }
          endContent={
            <Stack direction="horizontal" align="center" gap={3}>
              <Text type="supporting" color="secondary" xstyle={styles.desktop}>
                Uma perspetiva sobre Portugal
              </Text>
              <Link
                as="a"
                href="https://prociv.gov.pt/"
                isExternalLink
                newTabLabel="Abre num novo separador"
                size="sm"
                xstyle={styles.sourceTag}
              >
                Fonte ANEPC
              </Link>
            </Stack>
          }
        />
      }
    >
      <Stack xstyle={styles.root}>
        {compact && (
          <VisuallyHidden>
            <Heading level={1}>Portugal, agora.</Heading>
          </VisuallyHidden>
        )}
        {!compact && (
          <Stack xstyle={styles.desktopChrome}>
            <Stack
              as="section"
              direction="horizontal"
              align="center"
              justify="between"
              gap={5}
              xstyle={styles.overview}
            >
              <Stack gap={1}>
                <Text type="supporting" xstyle={styles.eyebrow}>
                  PROTEÇÃO E SOCORRO
                </Text>
                <Heading level={1} xstyle={styles.title}>
                  Portugal, agora.
                </Heading>
                <Text color="secondary" xstyle={styles.desktop}>
                  O que acontece. Onde acontece. De forma simples.
                </Text>
              </Stack>
              <Stack direction="horizontal" gap={6} xstyle={styles.metrics}>
                <Metric
                  label="ocorrências"
                  value={snapshot ? String(rows.length) : '—'}
                  icon={Activity}
                />
                <Metric
                  label="operacionais"
                  value={snapshot ? resourceTotal(rows, 'personnel') : '—'}
                  icon={Users}
                />
                <Metric
                  label="meios terrestres"
                  value={snapshot ? resourceTotal(rows, 'groundVehicles') : '—'}
                  icon={Car}
                />
              </Stack>
            </Stack>
            <Stack
              as="section"
              gap={3}
              xstyle={styles.toolbar}
              aria-label="Filtrar ocorrências"
            >
              <Stack direction="horizontal" gap={3} align="center">
                <StackItem size="fill">
                  <TextInput
                    label="Pesquisar ocorrências"
                    isLabelHidden
                    type="search"
                    placeholder="Pesquisar local ou ocorrência…"
                    startIcon={Search}
                    value={search}
                    onChange={setSearch}
                    hasClear
                    width="100%"
                  />
                </StackItem>
                <StackItem size="static">
                  <Button
                    label="Filtros"
                    icon={<Icon icon={SlidersHorizontal} />}
                    variant={region || status ? 'primary' : 'secondary'}
                    onClick={() => setFiltersOpen(true)}
                  />
                </StackItem>
                <StackItem size="static">
                  <Button
                    label="Atualizar"
                    tooltip="Atualizar ocorrências"
                    isIconOnly
                    icon={<Icon icon={RefreshCw} />}
                    onClick={() => void refresh()}
                    isLoading={refreshing}
                  />
                </StackItem>
              </Stack>
              {categoryControls}
            </Stack>
            {(error || stale) && (
              <Banner
                status="warning"
                title={
                  error ||
                  'A fonte está desatualizada. Consulte a hora dos dados antes de interpretar o mapa.'
                }
              />
            )}
          </Stack>
        )}
        <Stack xstyle={styles.workspace}>
          {compact && (
            <>
              <Stack gap={3} xstyle={styles.mobileTools}>
                <Button
                  label={
                    activeFilters
                      ? 'Pesquisar · filtros ativos'
                      : 'Pesquisar e filtrar'
                  }
                  icon={<Icon icon={Search} />}
                  variant={activeFilters ? 'primary' : 'secondary'}
                  onClick={() => setFiltersOpen(true)}
                  aria-haspopup="dialog"
                  aria-expanded={filtersOpen}
                  xstyle={[
                    styles.floatingButton,
                    !activeFilters && styles.floatingSurface,
                  ]}
                />
              </Stack>
              <Stack
                direction="horizontal"
                gap={3}
                align="center"
                xstyle={styles.mobileActions}
              >
                <Button
                  label={view === 'map' ? `Lista · ${filtered.length}` : 'Mapa'}
                  aria-label={view === 'map' ? 'Lista' : 'Mapa'}
                  icon={<Icon icon={view === 'map' ? ListIcon : Map} />}
                  variant="primary"
                  onClick={() => setView(view === 'map' ? 'list' : 'map')}
                  xstyle={styles.floatingButton}
                />
                <Button
                  label="Atualizar"
                  isIconOnly
                  icon={<Icon icon={RefreshCw} />}
                  onClick={() => void refresh()}
                  isLoading={refreshing}
                  xstyle={[styles.floatingButton, styles.floatingSurface]}
                />
                {warnings.length > 0 && (
                  <Stack role="status">
                    <Button
                      label="Avisos sobre os dados"
                      isIconOnly
                      icon={<Icon icon={TriangleAlert} />}
                      onClick={() => setStatusOpen(true)}
                      aria-haspopup="dialog"
                      aria-expanded={statusOpen}
                      xstyle={[styles.floatingButton, styles.warningButton]}
                    />
                  </Stack>
                )}
              </Stack>
              <VisuallyHidden>
                <Text role="status">
                  {filtered.length} ocorrências
                  {activeFilters ? ', filtros ativos' : ''}
                  {warnings.length ? ', existem avisos sobre os dados' : ''}
                </Text>
              </VisuallyHidden>
            </>
          )}

          <Stack
            as="aside"
            aria-label="Lista de ocorrências"
            xstyle={[styles.rail, view === 'map' && styles.hideMobile]}
          >
            <Stack
              direction="horizontal"
              justify="between"
              align="center"
              xstyle={styles.railHeading}
            >
              <Heading level={2}>Ocorrências</Heading>
              <Text type="supporting" color="secondary" aria-live="polite">
                {filtered.length} {activeFilters ? 'resultados' : 'em aberto'}
              </Text>
            </Stack>
            <Stack xstyle={styles.scroll}>
              {!snapshot ? (
                <EmptyState
                  title={
                    loading ? 'A consultar a ANEPC…' : 'Sem ligação à fonte'
                  }
                  description={
                    loading
                      ? 'As ocorrências atuais aparecem aqui dentro de instantes.'
                      : 'Não foi possível obter as ocorrências atuais.'
                  }
                  icon={<Icon icon={Activity} />}
                  actions={
                    !loading ? (
                      <Button
                        label="Tentar novamente"
                        onClick={() => void refresh()}
                        isLoading={refreshing}
                      />
                    ) : undefined
                  }
                />
              ) : !filtered.length ? (
                <EmptyState
                  title={
                    activeFilters
                      ? 'Nenhuma ocorrência encontrada'
                      : 'Sem ocorrências publicadas'
                  }
                  description={
                    activeFilters
                      ? 'Experimente outro local ou limpe os filtros.'
                      : 'A fonte não devolveu ocorrências em aberto.'
                  }
                  actions={
                    activeFilters ? (
                      <Button label="Limpar filtros" onClick={reset} />
                    ) : undefined
                  }
                />
              ) : (
                <List
                  hasDividers
                  edge="padded"
                  density="spacious"
                  aria-label="Ocorrências atuais"
                >
                  {filtered.map((row) => (
                    <ListItem
                      key={row.id}
                      itemKey={row.id}
                      isSelected={selected?.id === row.id}
                      onClick={() => select(row.id)}
                      startContent={<CategoryIcon row={row} />}
                      label={
                        <Stack direction="horizontal" justify="between" gap={2}>
                          <Text type="label">
                            {row.municipality ?? 'Local não indicado'}
                          </Text>
                          <Text type="supporting" color="secondary">
                            {dateTime(row.startedAt)}
                          </Text>
                        </Stack>
                      }
                      description={
                        <Stack gap={2}>
                          <Text type="supporting" color="primary">
                            {natureLabel(row)}
                          </Text>
                          <Stack
                            direction="horizontal"
                            justify="between"
                            gap={2}
                          >
                            <Text type="supporting" color="secondary">
                              {row.groupedStatus ?? 'Estado não indicado'}
                            </Text>
                            <Text type="supporting" color="secondary">
                              {row.personnel ?? '—'} oper. ·{' '}
                              {row.groundVehicles ?? '—'} viat.
                            </Text>
                          </Stack>
                        </Stack>
                      }
                      endContent={<Icon icon={ChevronRight} size="sm" />}
                    />
                  ))}
                </List>
              )}
            </Stack>
            <Stack gap={1} xstyle={styles.railFooter}>
              <Text type="supporting" color="secondary">
                Portugal continental · Mais recentes primeiro
              </Text>
              <Text type="supporting" color="secondary">
                {filtered.filter((r) => !hasPoint(r)).length
                  ? `${filtered.filter((r) => !hasPoint(r)).length} sem localização no mapa · `
                  : ''}
                Atualização automática a cada minuto
              </Text>
            </Stack>
          </Stack>
          <Stack
            as="section"
            aria-label="Mapa de ocorrências"
            xstyle={[styles.mapPanel, view === 'list' && styles.hideMobile]}
          >
            <OccurrenceMap
              rows={filtered}
              selected={selected ?? null}
              onSelect={select}
              onWarning={setMapWarning}
              compact={compact}
            />
            <Stack
              direction="horizontal"
              align="center"
              gap={2}
              xstyle={styles.mapCaption}
            >
              <MapPin size={15} aria-hidden />
              <Text type="label">Portugal continental</Text>
              <Text type="supporting" color="secondary">
                / {filtered.filter(hasPoint).length} no mapa
              </Text>
            </Stack>
            {selected && !compact && (
              <Card padding={5} xstyle={styles.detailCard}>
                <Detail
                  row={selected}
                  onClose={() => select(null)}
                  onMap={() => {
                    setView('map');
                    select(null);
                  }}
                />
              </Card>
            )}
          </Stack>
        </Stack>
        <Stack
          as="footer"
          direction="horizontal"
          align="center"
          justify="between"
          gap={2}
          xstyle={styles.footer}
        >
          <Text type="supporting" color="secondary">
            Dados ANEPC ·{' '}
            {snapshot
              ? `Fonte às ${dateTime(snapshot.sourceUpdatedAt)}`
              : 'A aguardar dados'}
          </Text>
          <Text type="supporting" color="secondary" xstyle={styles.desktop}>
            Projeto independente · Em emergência, ligue{' '}
            <a href="tel:112">112</a>
          </Text>
          <Text type="supporting" color="secondary" xstyle={styles.mobileOnly}>
            Emergência <a href="tel:112">112</a>
          </Text>
        </Stack>
        <BottomSheet
          isOpen={filtersOpen}
          onOpenChange={setFiltersOpen}
          label="Filtrar ocorrências"
          height={compact ? 'tall' : 'hug'}
        >
          {filterControls}
        </BottomSheet>
        {compact && (
          <BottomSheet
            isOpen={statusOpen && warnings.length > 0}
            onOpenChange={setStatusOpen}
            label="Avisos sobre os dados"
            height="hug"
          >
            <Stack gap={4}>
              <Heading level={2}>Sobre os dados</Heading>
              {warnings.map((message) => (
                <Text key={message}>{message}</Text>
              ))}
              <Text type="supporting" color="secondary">
                Fonte às {dateTime(snapshot?.sourceUpdatedAt)}
              </Text>
              <Button
                label="Atualizar agora"
                icon={<Icon icon={RefreshCw} />}
                onClick={() => {
                  setStatusOpen(false);
                  void refresh();
                }}
              />
              <Button
                label="Fechar aviso"
                variant="ghost"
                onClick={() => setStatusOpen(false)}
              />
            </Stack>
          </BottomSheet>
        )}
        {compact && (
          <BottomSheet
            isOpen={Boolean(selected)}
            onOpenChange={(open) => {
              if (!open) select(null);
            }}
            label="Detalhes da ocorrência"
            height="hug"
          >
            {selected && (
              <Detail
                row={selected}
                onClose={() => select(null)}
                onMap={() => {
                  setView('map');
                  select(null);
                }}
              />
            )}
          </BottomSheet>
        )}
      </Stack>
    </AppShell>
  );
}

function Metric({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: typeof Activity;
}) {
  return (
    <Stack gap={1}>
      <Stack direction="horizontal" align="center" gap={2}>
        <Icon icon={icon} size="sm" />
        <Text xstyle={styles.metricValue} hasTabularNumbers>
          {value}
        </Text>
      </Stack>
      <Text type="supporting" color="secondary">
        {label}
      </Text>
    </Stack>
  );
}
function CategoryIcon({ row }: { row: Occurrence }) {
  const kind = category(row);
  return (
    <Stack
      align="center"
      justify="center"
      xstyle={[styles.categoryIcon, styles[kind]]}
    >
      <Icon icon={icons[kind]} size="md" />
    </Stack>
  );
}
function Detail({
  row,
  onClose,
  onMap,
}: {
  row: Occurrence;
  onClose: () => void;
  onMap: () => void;
}) {
  return (
    <Stack gap={4}>
      <Stack direction="horizontal" align="start" justify="between" gap={3}>
        <Stack direction="horizontal" gap={3} align="center">
          <CategoryIcon row={row} />
          <Stack gap={1}>
            <Text type="supporting" color="secondary">
              {row.groupedStatus ?? 'Estado não indicado'}
            </Text>
            <Heading level={2}>
              {row.municipality ?? 'Local não indicado'}
            </Heading>
          </Stack>
        </Stack>
        <Button
          label="Fechar detalhes"
          variant="ghost"
          size="sm"
          isIconOnly
          icon={<Icon icon={X} />}
          onClick={onClose}
        />
      </Stack>
      <Stack gap={1}>
        <Heading level={3}>{natureLabel(row)}</Heading>
        <Text color="secondary">
          {[row.locality, row.parish].filter(Boolean).join(' · ') ||
            'Localidade não indicada'}
        </Text>
        <Text type="supporting" color="secondary">
          {row.address}
        </Text>
      </Stack>
      <Stack
        direction="horizontal"
        justify="between"
        gap={3}
        xstyle={styles.resources}
      >
        <Metric
          label="operacionais"
          value={String(row.personnel ?? '—')}
          icon={Users}
        />
        <Metric
          label="terrestres"
          value={String(row.groundVehicles ?? '—')}
          icon={Car}
        />
        <Metric
          label="aéreos"
          value={String(row.aircraft ?? '—')}
          icon={Plane}
        />
      </Stack>
      <Stack gap={2}>
        <Text type="supporting" color="secondary">
          Início <Text type="label">{dateTime(row.startedAt, true)}</Text>
        </Text>
        <Text type="supporting" color="secondary">
          Estado <Text type="label">{row.status ?? 'Não indicado'}</Text>
        </Text>
        <Text type="supporting" color="secondary">
          N.º {row.number ?? row.id} · Fonte às {dateTime(row.sourceUpdatedAt)}
        </Text>
      </Stack>
      {!hasPoint(row) && (
        <Text type="supporting" color="secondary">
          Esta ocorrência não tem coordenadas publicadas.
        </Text>
      )}
      <Text type="supporting" color="secondary">
        Fonte: ANEPC. A localização é indicativa. Dados em aberto, sem
        histórico.
      </Text>
      <Button
        label="Voltar ao mapa"
        icon={<Icon icon={Map} />}
        onClick={onMap}
        variant="secondary"
      />
    </Stack>
  );
}

const styles = stylex.create({
  desktopChrome: {
    display: {
      default: 'flex',
      '@media (max-width: 767px), (max-width: 1023px) and (max-height: 500px)':
        'none',
    },
    gap: 0,
    flexShrink: 0,
  },
  mobileTools: {
    position: 'absolute',
    top: '1rem',
    left: '1rem',
    zIndex: 600,
    alignItems: 'flex-start',
    maxWidth: 'calc(100% - 5.5rem)',
  },
  mobileActions: {
    position: 'absolute',
    bottom: '2.25rem',
    left: '1rem',
    zIndex: 600,
  },
  floatingButton: {
    minHeight: '44px',
    boxShadow: 'var(--pulso-shadow)',
    borderRadius: '2rem',
  },
  floatingSurface: {
    backgroundColor: 'var(--color-background-surface)',
    color: 'var(--color-text-primary)',
  },
  warningButton: {
    backgroundColor: '#fff1bd',
    color: '#805300',
    width: '44px',
  },
  root: {
    // AppShell owns the dynamic viewport and the header's intrinsic height.
    height: '100%',
    minHeight: 0,
    overflow: 'hidden',
    gap: 0,
  },
  overview: {
    paddingBlock: {
      default: '1.5rem',
      '@media (max-width: 767px), (max-width: 1023px) and (max-height: 500px)':
        '0.9rem',
    },
    paddingInline: {
      default: '2rem',
      '@media (max-width: 767px), (max-width: 1023px) and (max-height: 500px)':
        '1rem',
    },
    flexShrink: 0,
    flexWrap: {
      default: 'nowrap',
      '@media (max-width: 767px), (max-width: 1023px) and (max-height: 500px)':
        'wrap',
    },
    rowGap: '0.8rem',
  },
  title: {
    fontSize: {
      default: '2.2rem',
      '@media (max-width: 767px), (max-width: 1023px) and (max-height: 500px)':
        '1.7rem',
    },
    lineHeight: 1.15,
  },
  eyebrow: { letterSpacing: '0.16em', fontSize: '0.65rem', fontWeight: 700 },
  sourceTag: {
    whiteSpace: 'nowrap',
    flexShrink: 0,
    backgroundColor: 'var(--pulso-mint)',
    padding: '0.45rem 0.75rem',
    borderRadius: '2rem',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.35rem',
    fontSize: '0.75rem',
  },
  metrics: {
    columnGap: {
      default: '2.5rem',
      '@media (max-width: 767px), (max-width: 1023px) and (max-height: 500px)':
        '0.75rem',
    },
    width: {
      default: 'auto',
      '@media (max-width: 767px), (max-width: 1023px) and (max-height: 500px)':
        '100%',
    },
    display: {
      default: 'flex',
      '@media (max-width: 767px), (max-width: 1023px) and (max-height: 500px)':
        'grid',
    },
    gridTemplateColumns: 'repeat(3,minmax(0,1fr))',
  },
  metricValue: {
    fontSize: {
      default: '1.75rem',
      '@media (max-width: 767px), (max-width: 1023px) and (max-height: 500px)':
        '1.4rem',
    },
    fontWeight: 500,
    letterSpacing: '-0.06em',
    lineHeight: 1.2,
  },
  toolbar: {
    paddingBlock: '0.75rem',
    paddingInline: {
      default: '2rem',
      '@media (max-width: 767px), (max-width: 1023px) and (max-height: 500px)':
        '1rem',
    },
    backgroundColor: 'var(--color-background-surface)',
    borderBlock: '1px solid var(--color-border)',
    flexShrink: 0,
  },
  categoryItem: {
    // The button is inline-flex, so a block wrapper keeps a baseline gap under
    // icon labels and the item becomes taller than the button.
    display: 'flex',
  },
  categoryButton: {
    minHeight: {
      default: null,
      '@media (max-width: 767px), (max-width: 1023px) and (max-height: 500px)':
        '44px',
    },
    // The hit target is outside the border box, so it does not count toward
    // the row's height. Margin follows the inset the button measured, and the
    // flex row grows to match.
    marginTop: 'var(--astryx-hit-inset-top, 0px)',
    marginBottom: 'var(--astryx-hit-inset-bottom, 0px)',
  },
  categories: {
    overflowX: {
      default: 'auto',
      '@media (max-width: 767px), (max-width: 1023px) and (max-height: 500px)':
        'visible',
    },
    flexWrap: {
      default: 'nowrap',
      '@media (max-width: 767px), (max-width: 1023px) and (max-height: 500px)':
        'wrap',
    },
    rowGap: {
      default: null,
      '@media (max-width: 767px), (max-width: 1023px) and (max-height: 500px)':
        '0.5rem',
    },
    flexShrink: 0,
    paddingBottom: '0.1rem',
    scrollbarWidth: 'none',
  },
  workspace: {
    position: 'relative',
    display: 'grid',
    gridTemplateColumns: {
      default: 'var(--pulso-panel) minmax(0,1fr)',
      '@media (max-width: 767px), (max-width: 1023px) and (max-height: 500px)':
        'minmax(0,1fr)',
    },
    minHeight: 0,
    flex: 1,
    gap: 0,
  },
  rail: {
    backgroundColor: 'var(--color-background-surface)',
    minHeight: 0,
    minWidth: 0,
    gap: 0,
    borderRight: '1px solid var(--color-border)',
  },
  railHeading: {
    padding: '1.15rem 1.25rem',
    paddingTop: {
      default: '1.15rem',
      '@media (max-width: 767px), (max-width: 1023px) and (max-height: 500px)':
        '5rem',
    },
    borderBottom: '1px solid var(--color-border)',
    flexShrink: 0,
  },
  scroll: {
    minHeight: 0,
    overflowY: 'auto',
    flex: 1,
    gap: 0,
    overscrollBehavior: 'contain',
  },
  railFooter: {
    padding: '0.9rem 1.25rem',
    paddingBottom: {
      default: '0.9rem',
      '@media (max-width: 767px), (max-width: 1023px) and (max-height: 500px)':
        '6rem',
    },
    borderTop: '1px solid var(--color-border)',
    flexShrink: 0,
  },
  categoryIcon: {
    width: '2.4rem',
    height: '2.4rem',
    borderRadius: '0.75rem',
    flexShrink: 0,
    backgroundColor: 'var(--pulso-paper)',
  },
  fire: { color: 'var(--pulso-fire)' },
  accident: { color: 'var(--pulso-accident)' },
  assistance: { color: 'var(--pulso-assist)' },
  other: { color: 'var(--pulso-other)' },
  mapPanel: {
    position: 'relative',
    minHeight: 0,
    minWidth: 0,
    gap: 0,
    isolation: 'isolate',
  },
  mapCaption: {
    display: {
      default: 'flex',
      '@media (max-width: 767px), (max-width: 1023px) and (max-height: 500px)':
        'none',
    },
    position: 'absolute',
    top: '1rem',
    left: '1rem',
    zIndex: 500,
    backgroundColor: 'var(--pulso-white)',
    padding: '0.65rem 0.85rem',
    borderRadius: '0.65rem',
    boxShadow: 'var(--pulso-shadow)',
    pointerEvents: 'none',
  },
  detailCard: {
    position: 'absolute',
    bottom: '2rem',
    right: '1rem',
    zIndex: 500,
    width: '22rem',
    maxHeight: 'calc(100% - 5rem)',
    overflowY: 'auto',
    boxShadow: 'var(--pulso-shadow)',
  },
  resources: {
    paddingBlock: '1rem',
    borderBlock: '1px solid var(--color-border)',
  },
  footer: {
    padding: '0.5rem 1.25rem',
    flexShrink: 0,
    borderTop: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-background-surface)',
  },
  desktop: {
    display: {
      default: 'block',
      '@media (max-width: 767px), (max-width: 1023px) and (max-height: 500px)':
        'none',
    },
  },
  mobileOnly: {
    display: {
      default: 'none',
      '@media (max-width: 767px), (max-width: 1023px) and (max-height: 500px)':
        'block',
    },
  },
  hideMobile: {
    display: {
      default: 'flex',
      '@media (max-width: 767px), (max-width: 1023px) and (max-height: 500px)':
        'none',
    },
  },
});
