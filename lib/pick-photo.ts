import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { PHOTO_DATA_URL_LIMIT, fittedPhotoEdge, photoWithinLimit } from "@/lib/photo-size";

async function shrinkPhoto(uri: string, width: number, height: number) {
  let quality = 0.7;
  let edge = 960;
  let currentWidth = width || 1200;
  let currentHeight = height || 1200;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const size = fittedPhotoEdge(currentWidth, currentHeight, edge);
    const result = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: size.width, height: size.height } }],
      { compress: quality, format: ImageManipulator.SaveFormat.JPEG, base64: true },
    );
    if (!result.base64) break;
    const data = `data:image/jpeg;base64,${result.base64}`;
    if (photoWithinLimit(data)) return data;
    quality = Math.max(0.35, quality - 0.15);
    edge = Math.round(edge * 0.75);
    currentWidth = size.width;
    currentHeight = size.height;
    uri = result.uri;
  }
  throw new Error("Essa foto ficou grande demais. Tente outra mais simples.");
}

export async function pickPhotoDataUrl(source: "library" | "camera" = "library"): Promise<string | null> {
  if (source === "camera") {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) throw new Error("Permita a câmera para tirar a foto.");
  } else {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) throw new Error("Permita o acesso às fotos para enviar a imagem.");
  }
  const result =
    source === "camera"
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.7 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.7 });
  const asset = result.canceled ? null : result.assets[0];
  if (!asset?.uri) return null;
  const data = await shrinkPhoto(asset.uri, asset.width ?? 1200, asset.height ?? 1200);
  if (data.length > PHOTO_DATA_URL_LIMIT) {
    throw new Error("Essa foto ficou grande demais. Tente outra mais simples.");
  }
  return data;
}
