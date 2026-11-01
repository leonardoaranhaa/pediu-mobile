import { useEffect } from "react";
import { router } from "expo-router";
import { View } from "react-native";

export default function SellerSettingsRedirect() {
  useEffect(() => {
    router.replace({ pathname: "/(tabs)", params: { sellerTab: "settings" } });
  }, []);
  return <View />;
}
