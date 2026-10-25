import { useCallback, useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
  TextInput,
  Linking,
  Alert,
  Keyboard,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import {
  analyzeBase64,
  listScans,
  login,
  register,
  logout,
  isLoggedIn,
  SessionExpiredError,
} from "./src/api";
import type { ScanResponse, ScanHistoryItem } from "./src/types";

type Tab = "scan" | "history" | "account";

export default function App() {
  const [tab, setTab] = useState<Tab>("scan");
  const [authed, setAuthed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ScanResponse | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [history, setHistory] = useState<ScanHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "register">("login");

  useEffect(() => {
    isLoggedIn().then(setAuthed);
  }, []);

  const refreshHistory = useCallback(async () => {
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const data = await listScans();
      setHistory(data);
    } catch (e) {
      if (e instanceof SessionExpiredError) {
        setAuthed(false);
      } else {
        setHistoryError(e instanceof Error ? e.message : "Could not load history.");
      }
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authed && tab === "history") refreshHistory();
  }, [authed, tab, refreshHistory]);

  async function pick(from: "library" | "camera") {
    Keyboard.dismiss();
    setError(null);
    setResult(null);
    setPreview(null);

    const perm =
      from === "camera"
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!perm.granted) {
      setError("Camera/gallery permission is required to select images.");
      return;
    }

    const picked =
      from === "camera"
        ? await ImagePicker.launchCameraAsync({ quality: 0.8, base64: true })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ["images"],
            quality: 0.8,
            base64: true,
          });

    if (picked.canceled || !picked.assets?.[0]) return;

    const asset = picked.assets[0];
    setPreview(asset.uri);

    if (!asset.base64) {
      setError("Could not read the image data. Please choose another image.");
      return;
    }

    setLoading(true);

    try {
      const data = await analyzeBase64(asset.base64, asset.mimeType ?? "image/jpeg");
      setResult(data);
      refreshHistory();
    } catch (e) {
      if (e instanceof SessionExpiredError) {
        setAuthed(false);
      } else {
        setError(e instanceof Error ? e.message : "Analysis failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleAuth() {
    Keyboard.dismiss();
    setError(null);
    setLoading(true);
    try {
      if (mode === "login") await login(email.trim(), password);
      else await register(email.trim(), password);
      setAuthed(true);
      setTab("scan");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Authentication failed.");
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    await logout();
    setAuthed(false);
    setResult(null);
    setHistory([]);
  }

  if (!authed) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.authBox}>
          <Text style={styles.title}>DesignedPrice</Text>
          <Text style={styles.subtitle}>Sign in to scan & save history</Text>

          <TextInput
            style={styles.input}
            placeholder="Email"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            autoComplete="email"
            textContentType="emailAddress"
            editable={!loading}
          />
          <TextInput
            style={styles.input}
            placeholder="Password (min 10 characters)"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            textContentType={mode === "login" ? "password" : "newPassword"}
            editable={!loading}
          />

          {error && <Text style={styles.errorText}>{error}</Text>}

          <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={handleAuth} disabled={loading} activeOpacity={0.8}>
            {loading ? (
              <ActivityIndicator color="#fff" size="large" />
            ) : (
              <Text style={styles.buttonText}>{mode === "login" ? "Log in" : "Create account"}</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setMode(mode === "login" ? "register" : "login")} disabled={loading}>
            <Text style={styles.link}>
              {mode === "login" ? "Need an account? Register" : "Have an account? Log in"}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>DesignedPrice</Text>

        {tab === "scan" && (
          <>
            <Text style={styles.subtitle}>Camera or gallery → instant ID + price</Text>

            <View style={styles.row}>
              <TouchableOpacity
                style={[styles.button, styles.half]}
                onPress={() => pick("camera")}
                disabled={loading}
                activeOpacity={0.8}
              >
                <Text style={styles.buttonText}>📷 Camera</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.half, styles.secondary]}
                onPress={() => pick("library")}
                disabled={loading}
                activeOpacity={0.8}
              >
                <Text style={[styles.buttonText, { color: "#111" }]}>🖼️ Gallery</Text>
              </TouchableOpacity>
            </View>

            {loading && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#8b5cf6" />
                <Text style={styles.loadingText}>Analyzing with Gemini…</Text>
              </View>
            )}
            {error && (
              <View style={styles.errorBox} accessibilityLiveRegion="assertive">
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}
            {preview && (
              <Image source={{ uri: preview }} style={styles.preview} resizeMode="contain" accessibilityLabel="Preview of selected garment" />
            )}
            {result && <ResultCard result={result} />}
          </>
        )}

        {tab === "history" && (
          <>
            <Text style={styles.subtitle}>Your recent scans</Text>
            {historyLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#8b5cf6" />
                <Text style={styles.loadingText}>Loading history…</Text>
              </View>
            ) : historyError ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{historyError}</Text>
                <TouchableOpacity style={styles.retryButton} onPress={refreshHistory}>
                  <Text style={styles.retryButtonText}>Try again</Text>
                </TouchableOpacity>
              </View>
            ) : history.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>📭</Text>
                <Text style={styles.emptyTitle}>No scans yet</Text>
                <Text style={styles.emptyText}>Analyze a garment to see your history here.</Text>
              </View>
            ) : (
              history.map((s) => (
                <View key={s.id} style={styles.histCard}>
                  <Image source={{ uri: s.imageUrl }} style={styles.histThumb} resizeMode="cover" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.histTitle}>
                      {s.brand ?? "Unknown"} · {s.garmentType}
                    </Text>
                    {s.valuation ? (
                      <>
                        <Text style={styles.meta}>
                          ${s.valuation.estimatedLowPrice.toFixed(0)}–$
                          {s.valuation.estimatedHighPrice.toFixed(0)} · {s.valuation.suggestedEra}
                        </Text>
                        <Text style={styles.meta}>
                          {Math.round(s.valuation.confidenceScore * 100)}% confidence
                        </Text>
                      </>
                    ) : (
                      <Text style={styles.metaNoComps}>No comparable listings found</Text>
                    )}
                    <Text style={styles.meta}>{new Date(s.createdAt).toLocaleString()}</Text>
                  </View>
                </View>
              ))
            )}
          </>
        )}

        {tab === "account" && (
          <View style={{ marginTop: 20 }}>
            <TouchableOpacity style={styles.button} onPress={handleLogout} activeOpacity={0.8}>
              <Text style={styles.buttonText}>Log out</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Bottom tabs */}
      <View style={styles.tabs}>
        {(["scan", "history", "account"] as Tab[]).map((t) => (
          <TouchableOpacity key={t} style={styles.tab} onPress={() => setTab(t)} activeOpacity={0.7}>
            <Text style={[styles.tabText, tab === t && styles.tabActive]}>
              {t === "scan" ? "Scan" : t === "history" ? "History" : "Account"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}

function ResultCard({ result }: { result: ScanResponse }) {
  const conf = result.valuation ? Math.round(result.valuation.confidenceScore * 100) : 0;
  const isNoComparables = result.status === "NO_COMPARABLES";

  return (
    <View style={styles.card}>
      <Text style={styles.label}>IDENTIFICATION</Text>
      <Text style={styles.heading}>
        {result.identification.brand ?? "Unknown Brand"} · {result.identification.garmentType}
      </Text>
      {result.valuation ? (
        <>
          <Text style={[styles.label, { marginTop: 16 }]}>VALUATION</Text>
          <Text style={styles.price}>
            ${result.valuation.estimatedLowPrice.toFixed(0)} – $
            {result.valuation.estimatedHighPrice.toFixed(0)}
          </Text>
          <Text style={styles.meta}>
            Median ${result.valuation.medianPrice.toFixed(0)} · {result.valuation.suggestedEra} ·{" "}
            {conf}% conf.
          </Text>
          <Text style={[styles.meta, { marginTop: 4, fontSize: 11, color: "#a1a1aa" }]}>
            Based on {result.valuation.comparables.length} comparable sold listing{result.valuation.comparables.length !== 1 ? "s" : ""}. Estimates are indicative, not guaranteed prices.
          </Text>
          {result.valuation.comparables?.slice(0, 5).map((c) => (
            <TouchableOpacity key={c.id} style={styles.comp} onPress={() => Linking.openURL(c.itemUrl)} accessibilityLabel={`View ${c.title} on ${c.platform}`}>
              <Text style={styles.compTitle} numberOfLines={2}>
                {c.title}
              </Text>
              <Text style={styles.compPrice}>${c.price.toFixed(0)}</Text>
            </TouchableOpacity>
          ))}
        </>
      ) : (
        <View style={styles.noCompsContainer}>
          <Text style={styles.noCompsTitle}>
            {isNoComparables ? "No comparable sold listings found" : "Could not identify garment for pricing"}
          </Text>
          <Text style={styles.noCompsText}>
            {isNoComparables
              ? "The garment was identified, but there aren't enough recent sold listings to estimate a price range."
              : "Analysis couldn't identify the garment well enough to search for comparables."}
          </Text>
          <Text style={[styles.noCompsText, { fontSize: 12, marginTop: 8 }]}>
            Try a clearer photo of the brand tag, care label, or distinctive graphic. Ensure good lighting and the tag is readable.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fafafa" },
  container: { padding: 20, paddingBottom: 80 },
  authBox: { flex: 1, justifyContent: "center", padding: 24 },
  title: { fontSize: 28, fontWeight: "700", color: "#111", textAlign: "center" },
  subtitle: {
    fontSize: 14,
    color: "#71717a",
    textAlign: "center",
    marginTop: 6,
    marginBottom: 20,
  },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e4e4e7",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    fontSize: 16,
  },
  button: {
    backgroundColor: "#111",
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  secondary: { backgroundColor: "#f4f4f5" },
  half: { flex: 1 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  row: { flexDirection: "row", gap: 10 },
  link: { textAlign: "center", marginTop: 16, color: "#52525b" },
  errorBox: { marginTop: 14, backgroundColor: "#fef2f2", padding: 12, borderRadius: 12 },
  errorText: { color: "#b91c1c", fontSize: 14, textAlign: "center" },
  loadingContainer: { alignItems: "center", marginTop: 20, gap: 8 },
  loadingText: { fontSize: 14, color: "#71717a" },
  retryButton: { marginTop: 10, paddingVertical: 8, paddingHorizontal: 16, backgroundColor: "#8b5cf6", borderRadius: 8, alignSelf: "center" },
  retryButtonText: { color: "#fff", fontWeight: "600" },
  preview: { marginTop: 16, width: "100%", height: 260, borderRadius: 16, backgroundColor: "#f4f4f5" },
  card: {
    marginTop: 16,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: "#e4e4e7",
  },
  label: { fontSize: 11, fontWeight: "600", color: "#a1a1aa", letterSpacing: 1 },
  heading: { fontSize: 17, fontWeight: "600", color: "#18181b", marginTop: 4 },
  price: { fontSize: 24, fontWeight: "700", color: "#18181b", marginTop: 4 },
  meta: { fontSize: 13, color: "#71717a", marginTop: 4 },
  comp: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: "#f4f4f5" },
  compTitle: { fontSize: 13, color: "#3f3f46" },
  compPrice: { fontSize: 14, fontWeight: "700", marginTop: 4 },
  histCard: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#e4e4e7",
  },
  histThumb: { width: 64, height: 64, borderRadius: 10, backgroundColor: "#f4f4f5" },
  histTitle: { fontSize: 14, fontWeight: "600", color: "#18181b" },
  emptyState: { alignItems: "center", paddingVertical: 32, gap: 8 },
  emptyIcon: { fontSize: 32 },
  emptyTitle: { fontSize: 16, fontWeight: "600", color: "#18181b" },
  emptyText: { fontSize: 13, color: "#71717a", textAlign: "center" },
  metaNoComps: { fontSize: 13, color: "#f59e0b", marginTop: 4 },
  noCompsContainer: { paddingVertical: 8, gap: 6 },
  noCompsTitle: { fontSize: 14, fontWeight: "600", color: "#f59e0b" },
  noCompsText: { fontSize: 13, color: "#71717a" },
  tabs: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "#e4e4e7",
    backgroundColor: "#fff",
    paddingBottom: 8,
  },
  tab: { flex: 1, paddingVertical: 12, alignItems: "center" },
  tabText: { fontSize: 13, color: "#a1a1aa", fontWeight: "500" },
  tabActive: { color: "#111", fontWeight: "700" },
});