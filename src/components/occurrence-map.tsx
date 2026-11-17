'use client';
import { Button } from '@astryxdesign/core/Button';
import { Icon } from '@astryxdesign/core/Icon';
import { List, ListItem } from '@astryxdesign/core/List';
import { Stack } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';
import * as stylex from '@stylexjs/stylex';
import L from 'leaflet';
import { LocateFixed, Maximize, X } from 'lucide-react';
import { useEffect, useEffectEvent, useRef, useState } from 'react';
import {
  category,
  dateTime,
  hasPoint,
  natureLabel,
  type Occurrence,
} from '../lib/occurrences';

const mainland: L.LatLngBoundsExpression = [
  [36.8, -9.6],
  [42.2, -6.1],
];
const paths = {
  fire: 'M12 3c1 5-4 5-4 9 0 2 1 3 2 3-1-4 2-4 2-6 3 3 5 5 5 8a5 5 0 0 1-10 0C3 10 9 9 12 3Z',
  accident:
    'M5 17H3v-6l2-6h14l2 6v6h-2M5 17h14M7 17v3M17 17v3M3 11h18M7 14h1M16 14h1',
  assistance: 'M12 20 4 12a5 5 0 0 1 8-6 5 5 0 0 1 8 6Z',
  other: 'M12 3 3 7v5c0 5 9 9 9 9s9-4 9-9V7ZM8 12l3 3 5-6',
};

function pointKey(row: Occurrence) {
  return `${row.latitude}:${row.longitude}`;
}

export default function OccurrenceMap({
  rows,
  selected,
  onSelect,
  onWarning,
  compact,
}: {
  rows: Occurrence[];
  selected: Occurrence | null;
  onSelect: (id: string) => void;
  onWarning: (message: string) => void;
  compact: boolean;
}) {
  const container = useRef<HTMLElement>(null);
  const map = useRef<L.Map | null>(null);
  const layers = useRef<L.LayerGroup | null>(null);
  const [ready, setReady] = useState(false);
  const [tilesFailed, setTilesFailed] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [locating, setLocating] = useState(false);
  const select = useEffectEvent(onSelect);
  const focusPoint = useRef<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const sharedRows = rows.filter(
    (row) => hasPoint(row) && pointKey(row) === expanded,
  );
  const expandedKey = sharedRows.length > 1 ? expanded : null;

  const closeShared = useEffectEvent(() => {
    focusPoint.current = expandedKey;
    setExpanded(null);
  });

  useEffect(() => {
    if (!container.current) return;
    const instance = L.map(container.current, {
      zoomControl: false,
      minZoom: 5,
      maxZoom: 18,
      zoomSnap: 0.5,
      attributionControl: true,
    });
    map.current = instance;
    const tiles = L.tileLayer(
      process.env.NEXT_PUBLIC_MAP_TILE_URL ??
        'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      {
        maxZoom: 19,
        attribution:
          process.env.NEXT_PUBLIC_MAP_ATTRIBUTION ??
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      },
    ).addTo(instance);
    tiles.on('tileerror', () => setTilesFailed(true));
    tiles.on('tileload', () => setTilesFailed(false));
    L.control.zoom({ position: 'bottomright' }).addTo(instance);
    layers.current = L.layerGroup().addTo(instance);
    instance.on('click', () => setExpanded(null));
    instance.fitBounds(mainland, { padding: [24, 24], animate: false });
    const observer = new ResizeObserver(() =>
      instance.invalidateSize({ pan: false }),
    );
    observer.observe(container.current);
    setReady(true);
    return () => {
      observer.disconnect();
      instance.remove();
      map.current = null;
      layers.current = null;
    };
  }, []);

  useEffect(() => {
    const instance = map.current;
    const group = layers.current;
    if (!ready || !instance || !group) return;
    function render() {
      if (!instance || !group) return;
      group.clearLayers();
      const buckets = new globalThis.Map<
        string,
        (Occurrence & { latitude: number; longitude: number })[]
      >();
      // Group exact coordinates before screen clustering, including selected rows.
      const points = new globalThis.Map<
        string,
        (Occurrence & { latitude: number; longitude: number })[]
      >();
      for (const row of rows.filter(hasPoint)) {
        const key = pointKey(row);
        const point = points.get(key) ?? [];
        point.push(row);
        points.set(key, point);
      }
      for (const [point, members] of points) {
        members.sort((a, b) => a.id.localeCompare(b.id));
        const row = members[0];
        const pixel = instance.project([row.latitude, row.longitude]);
        const key =
          point === expandedKey ||
          members.some((r) => r.id === selected?.id) ||
          instance.getZoom() >= 14
            ? point
            : `${Math.floor(pixel.x / 48)}:${Math.floor(pixel.y / 48)}`;
        const bucket = buckets.get(key) ?? [];
        bucket.push(...members);
        buckets.set(key, bucket);
      }
      function addMarker(
        bucket: (Occurrence & { latitude: number; longitude: number })[],
        position: L.LatLngExpression,
        shared = false,
        opened = false,
      ) {
        if (!instance || !group) return;
        const row = bucket[0];
        const element = document.createElement('span');
        element.className =
          bucket.length > 1
            ? `${shared ? 'pulso-shared' : 'pulso-cluster'}${bucket.some((r) => r.id === selected?.id) ? ' pulso-selected' : ''}`
            : `pulso-pin pulso-${category(row)}${row.id === selected?.id ? ' pulso-selected' : ''}`;
        if (bucket.length > 1 && !shared)
          element.textContent = String(bucket.length);
        else {
          if (shared) {
            const count = document.createElement('span');
            count.className = 'pulso-shared-count';
            count.textContent = String(bucket.length);
            element.appendChild(count);
          }
          const svg = document.createElementNS(
            'http://www.w3.org/2000/svg',
            'svg',
          );
          svg.setAttribute('aria-hidden', 'true');
          svg.setAttribute('viewBox', '0 0 24 24');
          svg.setAttribute('width', '18');
          svg.setAttribute('height', '18');
          svg.setAttribute('fill', 'none');
          svg.setAttribute('stroke', 'currentColor');
          svg.setAttribute('stroke-width', '1.8');
          svg.setAttribute('stroke-linecap', 'round');
          svg.setAttribute('stroke-linejoin', 'round');
          const path = document.createElementNS(
            'http://www.w3.org/2000/svg',
            'path',
          );
          path.setAttribute(
            'd',
            shared
              ? 'M12 3 2 8l10 5 10-5-10-5ZM2 12l10 5 10-5M2 16l10 5 10-5'
              : paths[category(row)],
          );
          svg.appendChild(path);
          element.appendChild(svg);
        }
        const label =
          bucket.length > 1
            ? shared
              ? `${bucket.length} ocorrências neste local`
              : `Aproximar ${bucket.length} ocorrências`
            : `${row.municipality ?? 'Local não indicado'}: ${natureLabel(row)}`;
        const marker = L.marker(position, {
          icon: L.divIcon({
            html: element,
            className: 'pulso-marker',
            iconSize: [40, 40],
            iconAnchor: [20, 20],
          }),
          title: shared ? `${opened ? 'Recolher' : 'Ver'} ${label}` : label,
          keyboard: true,
          bubblingMouseEvents: false,
          zIndexOffset: row.id === selected?.id ? 500 : 0,
        }).addTo(group);
        marker.getElement()?.setAttribute('aria-label', label);
        if (shared) {
          marker.getElement()?.setAttribute('aria-expanded', String(opened));
          marker
            .getElement()
            ?.setAttribute('aria-controls', 'shared-occurrences');
        }
        marker.getElement()?.addEventListener('keydown', (event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            event.stopPropagation();
            if (shared) focusPoint.current = pointKey(row);
            marker.fire('click');
          }
          if (event.key === 'Escape') closeShared();
        });
        if (shared && focusPoint.current === pointKey(row)) {
          marker.getElement()?.focus({ preventScroll: true });
          focusPoint.current = null;
        }
        marker.on('click', () => {
          if (shared) setExpanded(opened ? null : pointKey(row));
          else {
            // Marker events do not bubble to the map's dismissal handler.
            setExpanded(null);
            if (bucket.length > 1)
              instance.setView(
                position,
                Math.min(instance.getMaxZoom(), instance.getZoom() + 2),
                {
                  animate: !window.matchMedia(
                    '(prefers-reduced-motion: reduce)',
                  ).matches,
                },
              );
            else select(row.id);
          }
        });
      }
      for (const bucket of buckets.values()) {
        const row = bucket[0];
        const shared =
          bucket.length > 1 &&
          bucket.every((r) => pointKey(r) === pointKey(row));
        const center = L.latLng(
          bucket.reduce((n, r) => n + r.latitude, 0) / bucket.length,
          bucket.reduce((n, r) => n + r.longitude, 0) / bucket.length,
        );
        const opened = shared && pointKey(row) === expandedKey;
        addMarker(bucket, center, shared, opened);
        if (opened) {
          const origin = instance.project(center);
          // Maintain at least 52px between targets, even for larger stacks.
          const radius = Math.max(60, 26 / Math.sin(Math.PI / bucket.length));
          bucket.forEach((member, index) => {
            const angle = (index * 2 * Math.PI) / bucket.length - Math.PI / 2;
            const position = instance.unproject(
              origin.add(
                L.point(Math.cos(angle) * radius, Math.sin(angle) * radius),
              ),
            );
            L.polyline([center, position], {
              className: 'pulso-spider-leg',
              weight: 2,
              interactive: false,
            }).addTo(group);
            addMarker([member], position);
          });
        }
      }
    }
    render();
    instance.on('zoomend', render);
    return () => {
      instance.off('zoomend', render);
      group.clearLayers();
    };
  }, [rows, selected?.id, ready, expandedKey]);

  useEffect(() => {
    onWarning(
      locationError ||
        (tilesFailed
          ? 'O fundo do mapa está indisponível. As ocorrências continuam acessíveis na lista.'
          : ''),
    );
  }, [locationError, tilesFailed, onWarning]);

  function fit() {
    const points = rows
      .filter(hasPoint)
      .map((r) => [r.latitude, r.longitude] as L.LatLngTuple);
    map.current?.fitBounds(points.length ? L.latLngBounds(points) : mainland, {
      padding: [50, 50],
      maxZoom: 11,
      animate: false,
    });
  }
  function locate() {
    if (!navigator.geolocation) {
      setLocationError('A localização não está disponível neste dispositivo.');
      return;
    }
    setLocating(true);
    setLocationError('');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        map.current?.setView(
          [position.coords.latitude, position.coords.longitude],
          11,
          { animate: false },
        );
        setLocating(false);
      },
      () => {
        setLocationError(
          'Não foi possível obter a sua localização. Pode explorar o mapa manualmente.',
        );
        setLocating(false);
      },
      { timeout: 10_000, maximumAge: 60_000 },
    );
  }
  return (
    <>
      <section
        ref={container}
        aria-label="Mapa interativo das ocorrências da ANEPC"
        {...stylex.props(styles.host)}
      />
      <Stack gap={2} xstyle={styles.controls}>
        <Button
          label="Enquadrar ocorrências"
          tooltip="Enquadrar ocorrências"
          isIconOnly
          icon={<Icon icon={Maximize} />}
          onClick={fit}
          xstyle={styles.controlButton}
        />
        <Button
          label="A minha localização"
          tooltip="A minha localização"
          isIconOnly
          icon={<Icon icon={LocateFixed} />}
          onClick={locate}
          xstyle={styles.controlButton}
          isLoading={locating}
        />
      </Stack>
      {expandedKey && (
        <Stack
          id="shared-occurrences"
          role="region"
          aria-label={`${sharedRows.length} ocorrências neste local`}
          gap={2}
          xstyle={styles.chooser}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              focusPoint.current = expandedKey;
              setExpanded(null);
            }
          }}
        >
          <Stack
            direction="horizontal"
            align="center"
            justify="between"
            gap={2}
          >
            <Text type="label">
              {sharedRows.length} ocorrências neste local
            </Text>
            <Button
              label="Fechar ocorrências neste local"
              isIconOnly
              variant="ghost"
              icon={<Icon icon={X} />}
              onClick={() => {
                focusPoint.current = expandedKey;
                setExpanded(null);
              }}
            />
          </Stack>
          <List hasDividers aria-label="Ocorrências neste local">
            {sharedRows.map((row) => (
              <ListItem
                key={row.id}
                itemKey={row.id}
                isSelected={row.id === selected?.id}
                label={natureLabel(row)}
                description={`N.º ${row.number ?? row.id} · ${dateTime(row.startedAt, true)} · ${row.status ?? row.groupedStatus ?? 'Estado não indicado'}`}
                onClick={() => select(row.id)}
              />
            ))}
          </List>
        </Stack>
      )}
      {!compact && (tilesFailed || locationError) && (
        <Stack role="status" xstyle={styles.notice}>
          <Text type="supporting">
            {locationError ||
              'O fundo do mapa está indisponível. As ocorrências continuam acessíveis na lista.'}
          </Text>
        </Stack>
      )}
    </>
  );
}
const styles = stylex.create({
  chooser: {
    position: 'absolute',
    left: '1rem',
    // Reserve the attribution strip and, in compact layouts, the action row.
    bottom: {
      default: '2rem',
      '@media (max-width: 767px), (max-width: 1023px) and (max-height: 500px)':
        '6rem',
    },
    width: 'min(22rem, calc(100% - 5rem))',
    maxHeight: {
      default: '40%',
      '@media (max-width: 767px), (max-width: 1023px) and (max-height: 500px)':
        'min(40%, calc(100% - 11rem))',
    },
    overflowY: 'auto',
    padding: '0.75rem',
    backgroundColor: 'var(--color-background-surface)',
    borderRadius: '0.75rem',
    boxShadow: '0 2px 12px #153d3933',
    zIndex: 500,
  },
  host: {
    height: '100%',
    width: '100%',
    backgroundColor: 'var(--pulso-mint)',
    minHeight: 0,
    zIndex: 0,
  },
  controls: {
    position: 'absolute',
    top: {
      default: '4rem',
      '@media (max-width: 767px), (max-width: 1023px) and (max-height: 500px)':
        '1rem',
    },
    right: '1rem',
    zIndex: 500,
  },
  controlButton: {
    backgroundColor: {
      default: null,
      '@media (max-width: 767px), (max-width: 1023px) and (max-height: 500px)':
        'var(--color-background-surface)',
    },
    minHeight: {
      default: null,
      '@media (max-width: 767px), (max-width: 1023px) and (max-height: 500px)':
        '44px',
    },
    minWidth: {
      default: null,
      '@media (max-width: 767px), (max-width: 1023px) and (max-height: 500px)':
        '44px',
    },
    borderRadius: {
      default: null,
      '@media (max-width: 767px), (max-width: 1023px) and (max-height: 500px)':
        '50%',
    },
    boxShadow: {
      default: null,
      '@media (max-width: 767px), (max-width: 1023px) and (max-height: 500px)':
        'var(--pulso-shadow)',
    },
  },
  notice: {
    position: 'absolute',
    bottom: '2rem',
    left: '1rem',
    right: '4rem',
    zIndex: 500,
    padding: '0.75rem',
    borderRadius: 'var(--pulso-radius)',
    backgroundColor: 'var(--color-background-surface)',
    boxShadow: 'var(--pulso-shadow)',
  },
});
