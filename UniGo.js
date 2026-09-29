// UniGo — React Native (Expo) + Reanimated 3 + react-native-maps
// npm i react-native-reanimated react-native-maps @react-navigation/native
//   @react-navigation/native-stack @react-navigation/bottom-tabs @expo/vector-icons
//   @expo-google-fonts/figtree expo-font   (Android: add Google Maps key in app.json)
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { View, Text, TextInput, Pressable, ScrollView, FlatList, Linking, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withTiming, withRepeat,
  withSequence, withDelay, FadeIn, FadeInDown, ZoomIn, Easing,
} from 'react-native-reanimated';
import MapView, { Marker } from 'react-native-maps';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import Svg, { G, Rect, Path, Circle } from 'react-native-svg';
import { useFonts, Figtree_500Medium, Figtree_700Bold, Figtree_800ExtraBold } from '@expo-google-fonts/figtree';

/* ───────── Tokens ───────── */
const C = { bg: '#FFFFFF', surface: '#F5F7FB', ink: '#0E1726', sub: '#5B677D', line: '#E3E8F0',
  blue: '#2350E8', blueSoft: '#E8EEFF', amber: '#FFB81C', ok: '#12A150' };
const F = { m: 'Figtree_500Medium', b: 'Figtree_700Bold', x: 'Figtree_800ExtraBold' };
const shadow = { shadowColor: '#0E1726', shadowOpacity: 0.08, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 4 };
const CENTER = { latitude: 16.4419, longitude: 80.6198 }; // ← replace with your campus

// ── Set these before release ──
const COLLEGE_DOMAIN = 'srmap.edu.in';
const GOOGLE = {
  androidClientId: '688867477160-hvi68tp8rmqv2cn8fg5k5mjtckgnhbra.apps.googleusercontent.com',
  webClientId: '688867477160-6c59814ojamjhe819miiukq2tjoomk0j.apps.googleusercontent.com',
};
const Auth = createContext(null);
WebBrowser.maybeCompleteAuthSession();

const PLACES = [
  { id: 'gate', quick: false, name: 'Main Gate', icon: 'enter', lat: 16.4399, lng: 80.6195, note: 'Campus entrance', walk: '1 min' },
  { id: 'admission', quick: false, name: 'Admission Cell', icon: 'document-text', lat: 16.4405, lng: 80.6198, note: 'Document verification', walk: '3 min' },
  { id: 'academic', name: 'Academic Block', icon: 'school', lat: 16.4425, lng: 80.6205, note: 'Classrooms and labs', walk: '4 min' },
  { id: 'hostel', name: 'Hostel Office', icon: 'bed', lat: 16.4408, lng: 80.6188, note: 'Room allotment, 9 am–5 pm', walk: '6 min' },
  { id: 'finance', name: 'Finance Office', icon: 'card', lat: 16.4416, lng: 80.6199, note: 'Fee payment and receipts', walk: '3 min' },
  { id: 'medical', name: 'Medical Center', icon: 'medkit', lat: 16.4431, lng: 80.6182, note: 'Open 24 hours', walk: '7 min' },
  { id: 'cafe', name: 'Cafeteria', icon: 'cafe', lat: 16.4421, lng: 80.6212, note: 'Open until 9 pm', walk: '2 min' },
  { id: 'bus', name: 'Bus Parking', icon: 'bus', lat: 16.4402, lng: 80.6209, note: 'Zones A to D', walk: '8 min' },
];
const BUSES = [
  { no: '21', zone: 'Zone A', where: 'Arrived at parking', place: 'bus' },
  { no: '34', zone: 'Zone B', where: 'Near main gate', place: 'bus' },
  { no: '47', zone: 'Zone C', where: 'Leaving campus', place: 'bus' },
];

const askCampusAI = async (q) => {
  try { // your backend proxies Gemini; never ship the API key in the app
    const r = await fetch('https://YOUR_BACKEND/ask', { method: 'POST',
      headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ q }) });
    return (await r.json()).answer;
  } catch { return "I can't reach the campus server right now. Try the map search instead."; }
};

/* ───────── Shared components ───────── */
const AP = Animated.createAnimatedComponent(Pressable);

function Tap({ children, style, onPress, lift, entering }) { // button = scale, card = lift
  const p = useSharedValue(0);
  const a = useAnimatedStyle(() => ({
    transform: [{ scale: lift ? 1 : 1 - p.value * 0.04 }, { translateY: lift ? -2 * p.value : 0 }],
  }));
  return (
    <AP  onPress={onPress} style={[a, style]}
      onPressIn={() => (p.value = withSpring(1, { damping: 14 }))}
      onPressOut={() => (p.value = withSpring(0, { damping: 14 }))}>{children}</AP>
  );
}

const Icon = ({ name, size = 22, color = C.blue }) => <Ionicons name={name} size={size} color={color} />;

function SearchBar({ value, onChange, placeholder, style }) { // expands on focus
  const f = useSharedValue(0);
  const a = useAnimatedStyle(() => ({ height: 56 + f.value * 6, borderColor: f.value ? C.blue : C.line, transform: [{ scale: 1 + f.value * 0.015 }] }));
  return (
    <Animated.View style={[s.search, a, style]}>
      <Icon name="search" color={C.sub} />
      <TextInput value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor={C.sub}
        style={s.searchInput} onFocus={() => (f.value = withSpring(1))} onBlur={() => (f.value = withSpring(0))} />
    </Animated.View>
  );
}

function Pulse({ size = 64, children }) { // FAB pulse ring
  const r = useSharedValue(0);
  useEffect(() => { r.value = withRepeat(withTiming(1, { duration: 1800, easing: Easing.out(Easing.quad) }), -1); }, []);
  const ring = useAnimatedStyle(() => ({ opacity: 0.35 * (1 - r.value), transform: [{ scale: 1 + r.value * 0.7 }] }));
  return (
    <View style={{ width: size, height: size }}>
      <Animated.View style={[{ position: 'absolute', width: size, height: size, borderRadius: size / 2, backgroundColor: C.blue }, ring]} />
      {children}
    </View>
  );
}

const Header = ({ title, sub }) => (
  <View style={{ paddingHorizontal: 20, paddingTop: 56, paddingBottom: 12 }}>
    <Text style={s.h1}>{title}</Text>{sub ? <Text style={s.sub}>{sub}</Text> : null}
  </View>
);

/* ───────── Logo: a U drawn as a route, starting at an amber dot ───────── */
function Logo({ size = 96, bg = C.blue, fg = '#fff' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 1024 1024">
      <Rect width="1024" height="1024" rx="230" fill={bg} />
      <Path d="M340 300V560A172 172 0 0 0 684 560V300" stroke={fg} strokeWidth="110" strokeLinecap="round" fill="none" />
      <Circle cx="340" cy="300" r="64" fill={C.amber} />
    </Svg>
  );
}

/* ───────── 1. Splash ───────── */
function Splash({ navigation }) {
  const o = useSharedValue(0), n = useSharedValue(-40);
  useEffect(() => {
    o.value = withTiming(1, { duration: 700 });
    n.value = withDelay(300, withSpring(0, { damping: 6 })); // needle settles
    const t = setTimeout(() => navigation.replace('Tabs'), 1800);
    return () => clearTimeout(t);
  }, []);
  const fade = useAnimatedStyle(() => ({ opacity: o.value, transform: [{ scale: 0.92 + o.value * 0.08 }] }));
  const needle = useAnimatedStyle(() => ({ transform: [{ rotate: `${n.value}deg` }] }));
  return (
    <View style={[s.fill, { alignItems: 'center', justifyContent: 'center' }]}>
      <Animated.View style={[{ alignItems: 'center' }, fade]}>
        <Logo size={104} />
        <Text style={[s.h1, { marginTop: 20 }]}>UniGo</Text>
        <Text style={s.sub}>Find Your Way.</Text>
      </Animated.View>
    </View>
  );
}

/* ───────── 2. Home ───────── */
function QuickCard({ p, onPress }) {
  const t = useSharedValue(0);
  const card = useAnimatedStyle(() => ({ transform: [{ scale: 1 - 0.03 * t.value }] }));
  return (
    <AP onPress={onPress} onPressIn={() => (t.value = withTiming(1, { duration: 90 }))} onPressOut={() => (t.value = withTiming(0, { duration: 160 }))} style={[s.quick, card]}>
      <View style={s.quickIcon}><Icon name={p.icon} /></View>
      <Text style={s.quickTitle}>{p.name}</Text>
      <Text style={s.small}>{p.walk} walk</Text>
    </AP>
  );
}

function Home({ navigation }) {
  const { user } = useContext(Auth);
  const [q, setQ] = useState('');
  const list = PLACES.filter((p) => p.quick !== false && p.name.toLowerCase().includes(q.toLowerCase()));
  return (
    <View style={s.fill}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, paddingTop: 56, paddingBottom: 140 }}>
        <View style={s.row}>
          <View style={{ flex: 1 }}>
            <Text style={s.sub}>Good to see you</Text>
            <Text style={s.h1}>{user.name?.split(' ')[0] ?? 'there'}</Text>
          </View>
          <Tap onPress={() => navigation.navigate('Profile')} style={s.avatarSm}><Text style={s.avatarTxt}>{user.name?.[0] ?? 'U'}</Text></Tap>
        </View>
        <SearchBar value={q} onChange={setQ} placeholder="Where to?" style={{ marginTop: 20 }} />
        <View style={s.grid}>
          {list.map((p) => <QuickCard key={p.id} p={p} onPress={() => navigation.navigate('Map', { placeId: p.id })} />)}
        </View>
        <Tap onPress={() => navigation.navigate('Buses')} style={s.busStrip}>
          <View style={[s.quickIcon, { marginBottom: 0 }]}><Icon name="bus" /></View>
          <View style={{ flex: 1 }}><Text style={s.quickTitle}>Find your bus</Text><Text style={s.small}>Search by number</Text></View>
          <Icon name="chevron-forward" color={C.sub} />
        </Tap>
      </ScrollView>
      <Tap onPress={() => navigation.navigate('AI')} style={s.fab}>
        <View style={s.fabCore}><Icon name="sparkles" size={26} color="#fff" /></View>
      </Tap>
    </View>
  );
}

/* ───────── 3. Campus Map ───────── */
function Marker2({ p, selected, onPress }) {
  const y = useSharedValue(0);
  useEffect(() => { y.value = selected ? withSequence(withTiming(-14, { duration: 140 }), withSpring(0, { damping: 4 })) : 0; }, [selected]);
  const a = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }, { scale: selected ? 1.15 : 1 }] }));
  return (
    <Marker coordinate={{ latitude: p.lat, longitude: p.lng }} onPress={onPress} tracksViewChanges={selected}>
      <Animated.View style={[s.pin, selected && { backgroundColor: C.blue }, a]}>
        <Icon name={p.icon} size={18} color={selected ? '#fff' : C.blue} />
      </Animated.View>
    </Marker>
  );
}

function CampusMap({ route }) {
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(route.params?.placeId ?? null);
  useEffect(() => { if (route.params?.placeId) setSel(route.params.placeId); }, [route.params]);
  const place = PLACES.find((p) => p.id === sel);
  const sheet = useSharedValue(420);
  const lastPlace = useRef(null);
  useEffect(() => { sheet.value = withTiming(place ? 0 : 420, { duration: 320, easing: Easing.out(Easing.cubic) }); }, [place]);
  if (place) lastPlace.current = place;
  const shown = place ?? lastPlace.current;
  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: sheet.value }] }));
  const match = PLACES.find((p) => q.length > 1 && p.name.toLowerCase().includes(q.toLowerCase()));
  useEffect(() => { if (match) setSel(match.id); }, [match?.id]);
  const go = () => Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lng}&travelmode=walking`);
  return (
    <View style={s.fill}>
      <MapView style={StyleSheet.absoluteFill} initialRegion={{ ...CENTER, latitudeDelta: 0.008, longitudeDelta: 0.008 }} showsUserLocation onPress={() => setSel(null)}>
        {PLACES.map((p) => <Marker2 key={p.id} p={p} selected={sel === p.id} onPress={() => setSel(p.id)} />)}
      </MapView>
      <SearchBar value={q} onChange={setQ} placeholder="Search campus" style={s.floatSearch} />
      <Animated.View style={[s.sheet, sheetStyle]}>
        {shown && (<>
          <View style={s.grab} />
          <Text style={s.h2}>{shown.name}</Text>
          <Text style={s.sub}>{shown.note} · {shown.walk} walk</Text>
          <Tap onPress={go} style={s.primary}><Icon name="navigate" color="#fff" /><Text style={s.primaryTxt}>Start walking</Text></Tap>
        </>)}
      </Animated.View>
    </View>
  );
}

/* ───────── 4. Bus Finder ───────── */
function Buses({ navigation }) {
  const [q, setQ] = useState('');
  return (
    <View style={s.fill}>
      <Header title="Find your bus" sub="Search by bus number" />
      <View style={{ paddingHorizontal: 20 }}><SearchBar value={q} onChange={setQ} placeholder="Bus number, e.g. 34" /></View>
      <FlatList data={BUSES.filter((b) => b.no.includes(q))} keyExtractor={(b) => b.no}
        contentContainerStyle={{ padding: 20, gap: 12 }}
        ListEmptyComponent={<Text style={s.sub}>No bus with that number. Check the digits and try again.</Text>}
        renderItem={({ item, index }) => (
          <Tap lift  style={s.busCard} onPress={() => navigation.navigate('Map', { placeId: item.place })}>
            <View style={s.busNo}><Text style={{ fontFamily: F.x, fontSize: 22, color: C.blue }}>{item.no}</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={s.quickTitle}>{item.zone}</Text>
              <Text style={s.small}>{item.where}</Text>
            </View>
            <View style={s.go}><Icon name="navigate" color="#fff" size={20} /></View>
          </Tap>
        )} />
    </View>
  );
}

/* ───────── 5. Ask UniGo ───────── */
function Dots() {
  return (
    <View style={{ flexDirection: 'row', gap: 5, padding: 4 }}>
      {[0, 1, 2].map((i) => <Dot key={i} i={i} />)}
    </View>
  );
}
function Dot({ i }) {
  const v = useSharedValue(0.3);
  useEffect(() => { v.value = withDelay(i * 160, withRepeat(withSequence(withTiming(1, { duration: 400 }), withTiming(0.3, { duration: 400 })), -1)); }, []);
  const a = useAnimatedStyle(() => ({ opacity: v.value }));
  return <Animated.View style={[{ width: 8, height: 8, borderRadius: 4, backgroundColor: C.sub }, a]} />;
}

function AskAI({ navigation }) {
  const [msgs, setMsgs] = useState([{ id: 0, me: false, text: 'Hi! Ask me where anything is on campus.' }]);
  const [txt, setTxt] = useState('');
  const [busy, setBusy] = useState(false);
  const ref = useRef();
  const send = async (t) => {
    const text = (t ?? txt).trim(); if (!text || busy) return;
    setTxt(''); setBusy(true);
    setMsgs((m) => [...m, { id: Date.now(), me: true, text }]);
    const answer = await askCampusAI(text);
    setMsgs((m) => [...m, { id: Date.now() + 1, me: false, text: answer }]); setBusy(false);
  };
  return (
    <View style={s.fill}>
      <View style={[s.row, { paddingTop: 52, paddingHorizontal: 12 }]}>
        <Tap onPress={() => navigation.goBack()} style={s.iconBtn}><Icon name="chevron-back" color={C.ink} /></Tap>
        <Text style={s.h2}>Ask UniGo</Text>
      </View>
      <FlatList ref={ref} data={msgs} keyExtractor={(m) => String(m.id)} contentContainerStyle={{ padding: 20, gap: 10 }}
        onContentSizeChange={() => ref.current?.scrollToEnd({ animated: true })}
        ListFooterComponent={busy ? <View style={[s.bubble, s.ai]}><Dots /></View> : null}
        renderItem={({ item }) => (
          <Animated.View entering={FadeInDown.duration(250)} style={[s.bubble, item.me ? s.me : s.ai]}>
            <Text style={{ fontFamily: F.m, fontSize: 15, color: item.me ? '#fff' : C.ink }}>{item.text}</Text>
          </Animated.View>
        )} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}>
        {['Where is APJ Block?', 'Where is Dean Office?', 'Nearest cafeteria?'].map((c) => (
          <Tap key={c} onPress={() => send(c)} style={s.chip}><Text style={{ fontFamily: F.b, color: C.blue }}>{c}</Text></Tap>
        ))}
      </ScrollView>
      <View style={[s.row, { padding: 16, gap: 10 }]}>
        <TextInput value={txt} onChangeText={setTxt} placeholder="Ask anything" placeholderTextColor={C.sub} style={[s.searchInput, s.composer]} onSubmitEditing={() => send()} />
        <Tap onPress={() => send()} style={s.go}><Icon name="arrow-up" color="#fff" /></Tap>
      </View>
    </View>
  );
}

/* ───────── Login, college ID, profile ───────── */
function Login() {
  const { signIn } = useContext(Auth);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [, res, prompt] = Google.useAuthRequest({ ...GOOGLE, selectAccount: true, extraParams: { hd: COLLEGE_DOMAIN } });
  useEffect(() => {
    if (res?.type === 'error') setErr('Google sign-in failed: ' + (res.error?.message ?? 'unknown error'));
  }, [res]);
  useEffect(() => {
    if (res?.type !== 'success') return;
    (async () => {
      setBusy(true);
      try {
        const r = await fetch('https://www.googleapis.com/userinfo/v2/me', { headers: { Authorization: `Bearer ${res.authentication.accessToken}` } });
        const u = await r.json();
        if (u.email?.toLowerCase().endsWith('@' + COLLEGE_DOMAIN)) signIn({ name: u.name, email: u.email });
        else setErr(`Use your college email ending in @${COLLEGE_DOMAIN}.`);
      } catch { setErr("Couldn't sign in. Check your connection and try again."); }
      setBusy(false);
    })();
  }, [res]);
  return (
    <View style={s.fill}>
      <View style={s.loginTop}>
        <Logo size={96} bg="#fff" fg={C.blue} />
        <Animated.Text  style={[s.h1, { color: '#fff', marginTop: 20 }]}>UniGo</Animated.Text>
        <Animated.Text  style={[s.sub, { color: '#CBD8FF' }]}>Find Your Way.</Animated.Text>
      </View>
      <Animated.View  style={{ padding: 24 }}>
        <Text style={s.h2}>Sign in</Text>
        <Text style={[s.sub, { marginBottom: 20 }]}>Use your college Google account.</Text>
        <Tap onPress={() => prompt()} style={s.googleBtn}>
          <Icon name="logo-google" color={C.ink} />
          <Text style={s.quickTitle}>{busy ? 'Signing in…' : 'Continue with Google'}</Text>
        </Tap>
        {err ? <Animated.Text  style={s.err}>{err}</Animated.Text> : null}
        {__DEV__ && (
          <Tap onPress={() => signIn({ name: 'Demo Student', email: 'demo@' + COLLEGE_DOMAIN })} style={{ alignSelf: 'center', padding: 14, marginTop: 8 }}>
            <Text style={s.small}>Skip with a demo account (testing only)</Text>
          </Tap>
        )}
      </Animated.View>
    </View>
  );
}

function IdSetup() {
  const { user, update } = useContext(Auth);
  const [id, setId] = useState('');
  const ok = id.trim().length >= 5;
  return (
    <View style={[s.fill, { padding: 24, paddingTop: 110 }]}>
      <Animated.View  style={s.avatarLg}><Text style={[s.avatarTxt, { fontSize: 36 }]}>{user.name?.[0] ?? 'U'}</Text></Animated.View>
      <Animated.Text  style={[s.h1, { marginTop: 20 }]}>Hi {user.name?.split(' ')[0]}</Animated.Text>
      <Text style={s.sub}>Enter your college ID to finish setting up.</Text>
      <TextInput value={id} onChangeText={setId} autoCapitalize="characters" placeholder="College ID, e.g. 22A91A0501" placeholderTextColor={C.sub} style={s.input} />
      <Tap onPress={() => ok && update({ collegeId: id.trim().toUpperCase() })} style={[s.primary, { opacity: ok ? 1 : 0.4 }]}>
        <Text style={s.primaryTxt}>Continue</Text>
      </Tap>
    </View>
  );
}

function Profile() {
  const { user, signOut } = useContext(Auth);
  const rows = [['mail', 'Email', user.email], ['card', 'College ID', user.collegeId], ['school', 'Campus', 'Your University']];
  return (
    <ScrollView style={s.fill} contentContainerStyle={{ padding: 20, paddingTop: 64 }}>
      <View style={{ alignItems: 'center' }}>
        <Animated.View >
          <View style={s.avatarLg}><Text style={[s.avatarTxt, { fontSize: 36 }]}>{user.name?.[0] ?? 'U'}</Text></View>
        </Animated.View>
        <Animated.Text  style={[s.h1, { marginTop: 16 }]}>{user.name}</Animated.Text>
        <Animated.Text  style={s.sub}>Student</Animated.Text>
      </View>
      <View style={{ marginTop: 24 }}>
        {rows.map(([ic, k, v], i) => (
          <Animated.View key={k}  style={s.infoRow}>
            <View style={[s.quickIcon, { marginBottom: 0 }]}><Icon name={ic} /></View>
            <View style={{ flex: 1 }}><Text style={s.small}>{k}</Text><Text style={s.quickTitle}>{v}</Text></View>
          </Animated.View>
        ))}
      </View>
      <Tap onPress={signOut} style={[s.primary, { backgroundColor: '#FDECEA', marginTop: 28 }]}>
        <Text style={[s.primaryTxt, { color: '#D92D20' }]}>Sign out</Text>
      </Tap>
    </ScrollView>
  );
}

/* ───────── Navigation ───────── */
const Stack = createNativeStackNavigator();
const Tabs = createBottomTabNavigator();
const tabIcon = { Home: 'home', Map: 'map', Buses: 'bus', Profile: 'person' };

function TabIcon({ name, color, focused }) {
  const v = useSharedValue(0);
  useEffect(() => { v.value = withSpring(focused ? 1 : 0, { damping: 9 }); }, [focused]);
  const a = useAnimatedStyle(() => ({ transform: [{ scale: 1 + 0.08 * v.value }] }));
  return <Animated.View style={a}><Ionicons name={focused ? name : name + '-outline'} size={24} color={color} /></Animated.View>;
}

function TabsRoot() {
  return (
    <Tabs.Navigator screenOptions={({ route }) => ({
      headerShown: false, tabBarActiveTintColor: C.blue, tabBarInactiveTintColor: C.sub,
      tabBarStyle: { height: 68, paddingBottom: 10, paddingTop: 8, borderTopColor: C.line },
      tabBarLabelStyle: { fontFamily: F.b, fontSize: 11 },
      tabBarIcon: ({ color, focused }) => <TabIcon name={tabIcon[route.name]} color={color} focused={focused} />,
    })}>
      <Tabs.Screen name="Home" component={Home} />
      <Tabs.Screen name="Map" component={CampusMap} />
      <Tabs.Screen name="Buses" component={Buses} />
      <Tabs.Screen name="Profile" component={Profile} />
    </Tabs.Navigator>
  );
}

export default function App() {
  const [ok] = useFonts({ Figtree_500Medium, Figtree_700Bold, Figtree_800ExtraBold });
  const [user, setUser] = useState(null); // add AsyncStorage later to stay signed in
  const ctx = { user, signIn: setUser, update: (p) => setUser((u) => ({ ...u, ...p })), signOut: () => setUser(null) };
  if (!ok) return null;
  return (
    <Auth.Provider value={ctx}>
      {!user ? <Login /> : !user.collegeId ? <IdSetup /> : (
        <NavigationContainer>
          <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade_from_bottom' }}>
            <Stack.Screen name="Splash" component={Splash} options={{ animation: 'fade' }} />
            <Stack.Screen name="Tabs" component={TabsRoot} options={{ animation: 'fade' }} />
            <Stack.Screen name="AI" component={AskAI} options={{ animation: 'slide_from_bottom' }} />
          </Stack.Navigator>
        </NavigationContainer>
      )}
    </Auth.Provider>
  );
}

/* ───────── Styles ───────── */
const s = StyleSheet.create({
  fill: { flex: 1, backgroundColor: C.bg },
  row: { flexDirection: 'row', alignItems: 'center' },
  h1: { fontFamily: F.x, fontSize: 28, color: C.ink, letterSpacing: -0.5 },
  h2: { fontFamily: F.x, fontSize: 20, color: C.ink },
  sub: { fontFamily: F.m, fontSize: 15, color: C.sub, marginTop: 4 },
  small: { fontFamily: F.m, fontSize: 13, color: C.sub, marginTop: 2 },
  logo: { width: 88, height: 88, borderRadius: 26, backgroundColor: C.blue, alignItems: 'center', justifyContent: 'center', ...shadow },
  welcome: { backgroundColor: C.blue, borderRadius: 24, padding: 22, ...shadow },
  whiteBtn: { backgroundColor: '#fff', height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 16, alignSelf: 'flex-start', paddingHorizontal: 18 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fff', borderRadius: 18, borderWidth: 1.5, paddingHorizontal: 16, ...shadow },
  searchInput: { flex: 1, fontFamily: F.m, fontSize: 16, color: C.ink },
  floatSearch: { position: 'absolute', top: 52, left: 16, right: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 20 },
  quick: { width: '48%', backgroundColor: C.surface, borderRadius: 20, padding: 16, minHeight: 116 },
  quickIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: C.blueSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  quickTitle: { fontFamily: F.b, fontSize: 16, color: C.ink },
  fab: { position: 'absolute', right: 20, bottom: 24 },
  fabCore: { width: 64, height: 64, borderRadius: 32, backgroundColor: C.blue, alignItems: 'center', justifyContent: 'center', ...shadow },
  pin: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: C.blue, ...shadow },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, paddingBottom: 28, ...shadow },
  grab: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: C.line, marginBottom: 14 },
  primary: { flexDirection: 'row', gap: 8, height: 56, borderRadius: 18, backgroundColor: C.blue, alignItems: 'center', justifyContent: 'center', marginTop: 16 },
  primaryTxt: { fontFamily: F.b, fontSize: 16, color: '#fff' },
  busCard: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: '#fff', borderRadius: 20, padding: 16, borderWidth: 1, borderColor: C.line, ...shadow },
  busNo: { width: 56, height: 56, borderRadius: 16, backgroundColor: C.blueSoft, alignItems: 'center', justifyContent: 'center' },
  go: { width: 48, height: 48, borderRadius: 24, backgroundColor: C.blue, alignItems: 'center', justifyContent: 'center' },
  iconBtn: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  bubble: { maxWidth: '82%', padding: 14, borderRadius: 20 },
  me: { alignSelf: 'flex-end', backgroundColor: C.blue, borderBottomRightRadius: 6 },
  ai: { alignSelf: 'flex-start', backgroundColor: C.surface, borderBottomLeftRadius: 6 },
  chip: { backgroundColor: C.blueSoft, height: 44, borderRadius: 22, paddingHorizontal: 16, justifyContent: 'center' },
  composer: { backgroundColor: C.surface, borderRadius: 24, height: 52, paddingHorizontal: 18 },
  track: { height: 8, borderRadius: 4, backgroundColor: C.blueSoft, overflow: 'hidden' },
  trackFill: { height: 8, borderRadius: 4, backgroundColor: C.blue },
  node: { width: 30, height: 30, borderRadius: 15, borderWidth: 2, borderColor: C.line, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  nodeDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: C.amber },
  link: { flex: 1, width: 2, backgroundColor: C.line, marginVertical: 2 },
  stepCard: { flex: 1, backgroundColor: C.surface, borderRadius: 18, padding: 16, marginBottom: 14, borderWidth: 1.5, borderColor: 'transparent' },
  avatarLg: { width: 96, height: 96, borderRadius: 48, backgroundColor: C.blue, alignItems: 'center', justifyContent: 'center' },
  avatarSm: { width: 48, height: 48, borderRadius: 24, backgroundColor: C.blue, alignItems: 'center', justifyContent: 'center' },
  avatarTxt: { fontFamily: F.x, fontSize: 20, color: '#fff' },
  quickWrap: { width: '48%' },
  busStrip: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: C.surface, borderRadius: 20, padding: 14, marginTop: 12 },
  input: { height: 56, borderRadius: 18, borderWidth: 1.5, borderColor: C.line, paddingHorizontal: 16, fontFamily: F.m, fontSize: 16, color: C.ink, marginTop: 24 },
  googleBtn: { flexDirection: 'row', gap: 12, height: 58, borderRadius: 18, backgroundColor: '#fff', borderWidth: 1.5, borderColor: C.line, alignItems: 'center', justifyContent: 'center', ...shadow },
  loginTop: { height: '48%', backgroundColor: C.blue, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderBottomLeftRadius: 40, borderBottomRightRadius: 40 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: C.surface, borderRadius: 18, padding: 14, marginTop: 10 },
  doneCard: { backgroundColor: '#E3F6EC', borderRadius: 18, padding: 16, alignItems: 'center' },
  err: { fontFamily: F.b, color: '#D92D20', marginTop: 12, textAlign: 'center' },
});
