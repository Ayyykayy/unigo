import { useEffect, useMemo, useRef } from "react";
import { StyleSheet } from "react-native";
import { WebView } from "react-native-webview";
import * as Location from "expo-location";

const PAD = 0.008; // how far from the center people can pan (about 900 m); adjust later

const buildHtml = (center, places) => `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    html, body, #map { height: 100%; margin: 0; padding: 0; }
    .pin { width: 22px; height: 22px; border-radius: 50%; background: #fff; border: 3px solid #2350E8; box-sizing: border-box; }
    .pin.sel { background: #2350E8; transform: scale(1.3); }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    const places = ${JSON.stringify(places.map((p) => ({ id: p.id, name: p.name, lat: p.lat, lng: p.lng })))};
    const c = [${center.latitude}, ${center.longitude}];
    const PAD = ${PAD};
    const bounds = L.latLngBounds([c[0] - PAD, c[1] - PAD], [c[0] + PAD, c[1] + PAD]);

    const map = L.map('map', {
      center: c, zoom: 17, minZoom: 15, maxZoom: 19,
      maxBounds: bounds, maxBoundsViscosity: 1.0, zoomControl: false
    });
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19, attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    function post(o) { window.ReactNativeWebView.postMessage(JSON.stringify(o)); }
    function pinIcon(sel) {
      return L.divIcon({ className: '', html: '<div class="pin' + (sel ? ' sel' : '') + '"></div>', iconSize: [22, 22], iconAnchor: [11, 11] });
    }

    const markers = {};
    places.forEach(function (p) {
      const m = L.marker([p.lat, p.lng], { icon: pinIcon(false) }).addTo(map);
      m.bindTooltip(p.name, { direction: 'top', offset: [0, -12] });
      m.on('click', function () { post({ type: 'select', id: p.id }); });
      markers[p.id] = m;
    });

    map.on('click', function () { post({ type: 'map' }); });

    window.selectPlace = function (id) {
      Object.keys(markers).forEach(function (k) { markers[k].setIcon(pinIcon(k === id)); });
      if (id && markers[id]) map.flyTo(markers[id].getLatLng(), 18);
    };

    let userMarker = null;
    window.setUserLocation = function (lat, lng) {
      if (!userMarker) {
        userMarker = L.circleMarker([lat, lng], { radius: 8, color: '#fff', weight: 3, fillColor: '#12A150', fillOpacity: 1 }).addTo(map);
      } else { userMarker.setLatLng([lat, lng]); }
    };
    true;
  </script>
</body>
</html>
`;

export default function LeafletMap({ center, places, selectedId, onSelect, onMapPress }) {
  const webRef = useRef(null);
  const ready = useRef(false);
  const html = useMemo(() => buildHtml(center, places), [center.latitude, center.longitude]);

  useEffect(() => {
    if (ready.current) {
      webRef.current?.injectJavaScript(`window.selectPlace(${JSON.stringify(selectedId)}); true;`);
    }
  }, [selectedId]);

  useEffect(() => {
    let sub;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;
      sub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, distanceInterval: 3 },
        (pos) => {
          const { latitude, longitude } = pos.coords;
          webRef.current?.injectJavaScript(`window.setUserLocation(${latitude}, ${longitude}); true;`);
        }
      );
    })();
    return () => sub?.remove();
  }, []);

  return (
    <WebView
      ref={webRef}
      originWhitelist={["*"]}
      source={{ html }}
      style={StyleSheet.absoluteFill}
      javaScriptEnabled
      onLoadEnd={() => {
        ready.current = true;
        webRef.current?.injectJavaScript(`window.selectPlace(${JSON.stringify(selectedId)}); true;`);
      }}
      onMessage={(e) => {
        const m = JSON.parse(e.nativeEvent.data);
        if (m.type === "select") onSelect?.(m.id);
        else if (m.type === "map") onMapPress?.();
      }}
    />
  );
}