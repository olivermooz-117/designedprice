import { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
  SafeAreaView,
  Linking,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { analyzeBase64, type ScanResponse } from "./src/api";

export default function App() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ScanResponse | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  async function pickAndAnalyze() {
    setError(null);
    setResult(null);

    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setError("Permission to access photos is required.");
      return;
    }

    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
      base64: true,
    });

    if (picked.canceled || !picked.assets?.[0]) return;

    const asset = picked.assets[0];
    setPreview(asset.uri);
    setLoading(true);

    try {
      const mime = asset.mimeType ?? "image/jpeg";
      const data = await analyzeBase64(asset.base64!, mime);
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Analysis failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>DesignedPrice</Text>
        <Text style={styles.subtitle}>
          Snap or choose a photo of vintage / streetwear to get ID + market price.
        </Text>

        <TouchableOpacity
          style={styles.button}
          onPress={pickAndAnalyze}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Choose Photo</Text>
          )}
        </TouchableOpacity>

        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {preview && (
          <Image source={{ uri: preview }} style={styles.preview} resizeMode="contain" />
        )}

        {result && (
          <View style={styles.card}>
            <Text style={styles.label}>IDENTIFICATION</Text>
            <Text style={styles.heading}>
              {result.identification.brand ?? "Unknown Brand"} ·{" "}
              {result.identification.garmentType}
            </Text>

            {result.valuation ? (
              <>
                <Text style={[styles.label, { marginTop: 16 }]}>VALUATION</Text>
                <Text style={styles.price}>
                  ${result.valuation.estimatedLowPrice.toFixed(0)} – $
                  {result.valuation.estimatedHighPrice.toFixed(0)}
                </Text>
                <Text style={styles.meta}>
                  Median ${result.valuation.medianPrice.toFixed(0)} · Era{" "}
                  {result.valuation.suggestedEra} ·{" "}
                  {Math.round(result.valuation.confidenceScore * 100)}% conf.
                </Text>

                {result.valuation.comparables.slice(0, 5).map((c) => (
                  <TouchableOpacity
                    key={c.id}
                    style={styles.comp}
                    onPress={() => Linking.openURL(c.itemUrl)}
                  >
                    <Text style={styles.compTitle} numberOfLines={2}>
                      {c.title}
                    </Text>
                    <Text style={styles.compPrice}>${c.price.toFixed(0)}</Text>
                  </TouchableOpacity>
                ))}
              </>
            ) : (
              <Text style={styles.meta}>No market comparables found.</Text>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fafafa" },
  container: { padding: 24, paddingBottom: 60 },
  title: { fontSize: 28, fontWeight: "700", color: "#111", textAlign: "center" },
  subtitle: {
    fontSize: 15,
    color: "#71717a",
    textAlign: "center",
    marginTop: 8,
    marginBottom: 28,
    lineHeight: 22,
  },
  button: {
    backgroundColor: "#111",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
  },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  errorBox: {
    marginTop: 16,
    backgroundColor: "#fef2f2",
    padding: 12,
    borderRadius: 12,
  },
  errorText: { color: "#b91c1c", fontSize: 14 },
  preview: {
    marginTop: 20,
    width: "100%",
    height: 280,
    borderRadius: 16,
    backgroundColor: "#f4f4f5",
  },
  card: {
    marginTop: 20,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "#e4e4e7",
  },
  label: {
    fontSize: 11,
    fontWeight: "600",
    color: "#a1a1aa",
    letterSpacing: 1,
  },
  heading: { fontSize: 18, fontWeight: "600", color: "#18181b", marginTop: 4 },
  price: { fontSize: 26, fontWeight: "700", color: "#18181b", marginTop: 4 },
  meta: { fontSize: 13, color: "#71717a", marginTop: 4 },
  comp: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f4f4f5",
  },
  compTitle: { fontSize: 13, color: "#3f3f46", lineHeight: 18 },
  compPrice: { fontSize: 14, fontWeight: "700", color: "#18181b", marginTop: 4 },
});
