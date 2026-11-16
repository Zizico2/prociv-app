'use client';
import { Button } from '@astryxdesign/core/Button';
import { Icon } from '@astryxdesign/core/Icon';
import { Stack } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';
import * as stylex from '@stylexjs/stylex';
import L from 'leaflet';
import { LocateFixed, Maximize } from 'lucide-react';
import { useEffect, useEffectEvent, useRef, useState } from 'react';
import {
  category,
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
      for (const row of rows.filter(hasPoint)) {
        const pixel = instance.project([row.latitude, row.longitude]);
        const key =
          row.id === selected?.id || instance.getZoom() >= 14
            ? row.id
            : `${Math.floor(pixel.x / 48)}:${Math.floor(pixel.y / 48)}`;
        const bucket = buckets.get(key) ?? [];
        bucket.push(row);
        buckets.set(key, bucket);
      }
      for (const bucket of buckets.values()) {
        const row = bucket[0];
        const lat = bucket.reduce((n, r) => n + r.latitude, 0) / bucket.length;
        const lon = bucket.reduce((n, r) => n + r.longitude, 0) / bucket.length;
        const element = document.createElement('span');
        element.className =
          bucket.length > 1
            ? 'pulso-cluster'
            : `pulso-pin pulso-${category(row)}${row.id === selected?.id ? ' pulso-selected' : ''}`;
        if (bucket.length > 1) element.textContent = String(bucket.length);
        else {
          const svg = document.createElementNS(
            'http://www.w3.org/2000/svg',
            'svg',
          );
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
          path.setAttribute('d', paths[category(row)]);
          svg.appendChild(path);
          element.appendChild(svg);
        }
        const label =
          bucket.length > 1
            ? `Aproximar ${bucket.length} ocorrências`
            : `${row.municipality ?? 'Local não indicado'}: ${natureLabel(row)}`;
        const marker = L.marker([lat, lon], {
          icon: L.divIcon({
            html: element,
            className: 'pulso-marker',
            iconSize: [40, 40],
            iconAnchor: [20, 20],
          }),
          title: label,
          keyboard: true,
          zIndexOffset: row.id === selected?.id ? 500 : 0,
        }).addTo(group);
        marker.getElement()?.setAttribute('aria-label', label);
        marker.on('click', () => {
          if (bucket.length > 1)
            instance.setView([lat, lon], instance.getZoom() + 2, {
              animate: !window.matchMedia('(prefers-reduced-motion: reduce)')
                .matches,
            });
          else select(row.id);
        });
      }
    }
    render();
    instance.on('zoomend', render);
    return () => {
      instance.off('zoomend', render);
      group.clearLayers();
    };
  }, [rows, selected?.id, ready]);

  useEffect(() => {
    if (selected && hasPoint(selected) && map.current)
      map.current.setView(
        [selected.latitude, selected.longitude],
        Math.max(map.current.getZoom(), 11),
        { animate: false },
      );
  }, [selected]);

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
