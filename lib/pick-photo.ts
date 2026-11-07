import * as ImagePicker from "expo-image-picker";

export async function pickPhotoDataUrl(): Promise<string | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new Error("Permita o acesso às fotos para enviar a imagem.");
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    quality: 0.35,
    base64: true,
    allowsEditing: false,
  });
  if (result.canceled || !result.assets[0]?.base64) return null;
  const asset = result.assets[0];
  const data = `data:${asset.mimeType ?? "image/jpeg"};base64,${asset.base64}`;
  if (data.length > 350_000) {
    throw new Error("Essa foto ficou grande demais. Escolha uma imagem menor.");
  }
  return data;
}
