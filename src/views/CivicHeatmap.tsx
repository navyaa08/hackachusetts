import { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.heat';
import { useStore } from '../store';
import { Badge, Panel } from '../components/ui';
import type { StrainEvent } from '../types';

interface Hotspot {
  key: string;
  roadLabel: string;
  lat: number;
  lng: number;
  count: number;
  avgGlare: number;
  avgStrain: number;
  glarePct: number;
}

function aggregate(events: StrainEvent[]): Hotspot[] {
  const map = new Map<string, StrainEvent[]>();
  for (const e of events) {
    const key = `${e.lat.toFixed(2)},${e.lng.toFixed(2)}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(e);
  }
  const spots: Hotspot[] = [];
  for (const [key, list] of map) {
    const avgGlare =
      list.reduce((s, e) => s + e.glare, 0) / list.length;
    const avgStrain =
      list.reduce((s, e) => s + e.strain, 0) / list.length;
    const glareCount = list.filter((e) => e.type === 'glare').length;
    spots.push({
      key,
      roadLabel: list[0].roadLabel,
      lat: list.reduce((s, e) => s + e.lat, 0) / list.length,
      lng: list.reduce((s, e) => s + e.lng, 0) / list.length,
      count: list.length,
      avgGlare,
      avgStrain,
      glarePct: Math.round((glareCount / list.length) * 100),
    });
  }
  return spots.sort((a, b) => b.count - a.count);
}

export default function CivicHeatmap() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapObj = useRef<L.Map | null>(null);
  const heatLayer = useRef<L.Layer | null>(null);
  const markerLayer = useRef<L.LayerGroup | null>(null);

  const events = useStore((s) => s.events);
  const [selected, setSelected] = useState<Hotspot | null>(null);

  const hotspots = useMemo(() => aggregate(events), [events]);
  const maxCount = useMemo(
    () => Math.max(1, ...hotspots.map((h) => h.count)),
    [hotspots]
  );

  // init map once
  useEffect(() => {
    if (mapObj.current || !mapRef.current) return;
    const map = L.map(mapRef.current, {
      center: [42.25, -71.75],
      zoom: 9,
      zoomControl: true,
    });
    L.tileLayer(
      'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
      }
    ).addTo(map);
    markerLayer.current = L.layerGroup().addTo(map);
    mapObj.current = map;
    return () => {
      map.remove();
      mapObj.current = null;
    };
  }, []);

  // redraw heat + markers when events change
  useEffect(() => {
    const map = mapObj.current;
    if (!map) return;

    // heat layer
    if (heatLayer.current) {
      map.removeLayer(heatLayer.current);
      heatLayer.current = null;
    }
    const heatPoints = events.map(
      (e) => [e.lat, e.lng, Math.min(1, e.strain / 100)] as [number, number, number]
    );
    // @ts-expect-error heatLayer added by leaflet.heat plugin
    heatLayer.current = L.heatLayer(heatPoints, {
      radius: 28,
      blur: 22,
      maxZoom: 12,
      gradient: {
        0.2: '#22c55e',
        0.45: '#eab308',
        0.7: '#f97316',
        1.0: '#ef4444',
      },
    }).addTo(map);

    // markers
    markerLayer.current?.clearLayers();
    for (const h of hotspots) {
      const r = 8 + (h.count / maxCount) * 20;
      const color =
        h.avgStrain >= 70 ? '#ef4444' : h.avgStrain >= 55 ? '#f97316' : '#eab308';
      const marker = L.circleMarker([h.lat, h.lng], {
        radius: r,
        color,
        weight: 2,
        fillColor: color,
        fillOpacity: 0.35,
      });
      marker.bindTooltip(
        `${h.roadLabel} · ${h.count} events`,
        { direction: 'top' }
      );
      marker.on('click', () => setSelected(h));
      markerLayer.current?.addLayer(marker);
    }
  }, [events, hotspots, maxCount]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      <div className="lg:col-span-2">
        <Panel
          title="Civic Road-Safety Heatmap"
          subtitle="Anonymized eye-strain & glare events · for DOT and city planners"
        >
          <div
            ref={mapRef}
            className="w-full rounded-xl overflow-hidden"
            style={{ height: 520 }}
          />
          <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-slate-400">
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-safe" /> Low strain
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-warn" /> Moderate
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-danger" /> Severe
            </span>
            <span className="ml-auto">Circle size = event volume</span>
          </div>
        </Panel>
      </div>

      <div className="space-y-5">
        <Panel title="Hotspot Ranking" subtitle={`${events.length} total events`}>
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {hotspots.map((h, i) => (
              <button
                key={h.key}
                onClick={() => {
                  setSelected(h);
                  mapObj.current?.flyTo([h.lat, h.lng], 12);
                }}
                className={`w-full text-left rounded-xl px-3 py-2.5 transition ${
                  selected?.key === h.key
                    ? 'bg-accent/15 ring-1 ring-accent/40'
                    : 'bg-panel2 hover:bg-panel2/70'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-200">
                    #{i + 1} {h.roadLabel}
                  </span>
                  <span className="font-mono text-sm text-accent">
                    {h.count}
                  </span>
                </div>
                <div className="flex gap-3 mt-1 text-xs text-slate-400">
                  <span>strain {Math.round(h.avgStrain)}</span>
                  <span>glare-driven {h.glarePct}%</span>
                </div>
              </button>
            ))}
            {hotspots.length === 0 && (
              <p className="text-sm text-slate-500">
                No events yet — take a drive on the HUD to generate data.
              </p>
            )}
          </div>
        </Panel>

        {selected && (
          <Panel title="Hotspot Detail">
            <div className="text-lg font-semibold text-slate-100">
              {selected.roadLabel}
            </div>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <Detail label="Events" value={`${selected.count}`} />
              <Detail
                label="Avg strain"
                value={`${Math.round(selected.avgStrain)}/100`}
              />
              <Detail
                label="Avg glare"
                value={`${Math.round(selected.avgGlare * 100)}%`}
              />
              <Detail label="Glare-driven" value={`${selected.glarePct}%`} />
            </div>
            <div className="mt-4">
              <div className="text-xs uppercase tracking-wider text-slate-400 mb-2">
                Suggested intervention
              </div>
              <Badge tone={selected.glarePct > 50 ? 'warn' : 'accent'}>
                {selected.glarePct > 50
                  ? '💡 Add glare-reducing lighting / anti-glare screens'
                  : '🚧 Review signage & lane geometry'}
              </Badge>
            </div>
            <p className="text-[11px] text-slate-500 mt-3">
              Coordinates are coarsened to ~1 km. No driver identity is stored.
            </p>
          </Panel>
        )}
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-panel2 px-3 py-2">
      <div className="text-[11px] text-slate-400">{label}</div>
      <div className="font-mono text-slate-100">{value}</div>
    </div>
  );
}
