import { createElement, useEffect, useMemo, useRef } from "react";
import { Platform, Text, View } from "react-native";
import { WebView } from "react-native-webview";

type Point = { latitude: number; longitude: number };
type Marker = Point & { label: string; color: string };

function mapHtml(markers: Marker[], draggable: boolean) {
  const payload = JSON.stringify(markers);
  return `<!doctype html>
<html><head><meta name="viewport" content="width=device-width, initial-scale=1" />
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<style>html,body,#map{margin:0;height:100%;background:#e7efe4} </style>
</head><body><div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
const markers = ${payload};
const first = markers[0] || { latitude: -23.55, longitude: -46.63 };
const map = L.map('map', { zoomControl: true }).setView([first.latitude, first.longitude], 16);
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap' }).addTo(map);
function send(lat, lng) {
  const message = JSON.stringify({ type: 'pediu-pin', latitude: lat, longitude: lng });
  if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(message);
  else window.parent.postMessage(message, '*');
}
markers.forEach((marker, index) => {
  const pin = L.marker([marker.latitude, marker.longitude], { draggable: ${draggable ? "true" : "false"} && index === 0 }).addTo(map);
  pin.bindPopup(marker.label);
  if (${draggable ? "true" : "false"} && index === 0) {
    pin.on('dragend', () => {
      const next = pin.getLatLng();
      send(next.lat, next.lng);
    });
    map.on('click', (event) => {
      pin.setLatLng(event.latlng);
      send(event.latlng.lat, event.latlng.lng);
    });
  }
});
if (markers.length > 1) {
  map.fitBounds(markers.map((marker) => [marker.latitude, marker.longitude]), { padding: [24, 24] });
}
</script></body></html>`;
}

function readMessage(raw: unknown, onChange?: (point: Point) => void) {
  if (!onChange || typeof raw !== "string") return;
  try {
    const parsed = JSON.parse(raw) as { type?: string; latitude?: number; longitude?: number };
    if (parsed.type !== "pediu-pin") return;
    if (parsed.latitude == null || parsed.longitude == null) return;
    onChange({ latitude: parsed.latitude, longitude: parsed.longitude });
  } catch {
    // Ignore messages from the map tiles.
  }
}

export function PinMap({
  latitude,
  longitude,
  label = "Ponto da entrega",
  anchorKey,
  onChange,
}: {
  latitude: number;
  longitude: number;
  label?: string;
  anchorKey: string | number;
  onChange: (point: Point) => void;
}) {
  const frozen = useRef<{ key: string; html: string } | null>(null);
  const key = String(anchorKey);
  if (!frozen.current || frozen.current.key !== key) {
    frozen.current = {
      key,
      html: mapHtml([{ latitude, longitude, label, color: "#E20D2A" }], true),
    };
  }
  return <MapFrame html={frozen.current.html} onChange={onChange} />;
}

export function RouteMap({ markers }: { markers: Marker[] }) {
  const html = useMemo(() => mapHtml(markers, false), [markers]);
  if (!markers.length) {
    return (
      <View style={{ height: 220, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: "#F4F1EC" }}>
        <Text>O mapa aparece quando a entrega tiver um ponto.</Text>
      </View>
    );
  }
  return <MapFrame html={html} />;
}

function MapFrame({
  html,
  onChange,
}: {
  html: string;
  onChange?: (point: Point) => void;
}) {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  useEffect(() => {
    if (Platform.OS !== "web") return;
    const listener = (event: MessageEvent) => {
      readMessage(typeof event.data === "string" ? event.data : "", (point) =>
        onChangeRef.current?.(point),
      );
    };
    window.addEventListener("message", listener);
    return () => window.removeEventListener("message", listener);
  }, []);

  if (Platform.OS === "web") {
    return createElement("iframe", {
      srcDoc: html,
      style: { width: "100%", height: 240, border: 0, borderRadius: 16 },
    });
  }

  return (
    <View style={{ height: 240, borderRadius: 16, overflow: "hidden" }}>
      <WebView
        originWhitelist={["*"]}
        source={{ html }}
        onMessage={(event) =>
          readMessage(event.nativeEvent.data, (point) => onChangeRef.current?.(point))
        }
      />
    </View>
  );
}
