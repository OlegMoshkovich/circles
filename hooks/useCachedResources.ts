import * as Font from "expo-font";
import * as React from "react";
import { Lora_400Regular, Lora_700Bold } from "@expo-google-fonts/lora";
import { CormorantGaramond_300Light } from "@expo-google-fonts/cormorant-garamond";

export default function useCachedResources() {
  const [isLoadingComplete, setLoadingComplete] = React.useState(false);

  // Load any resources or data that we need prior to rendering the app
  React.useEffect(() => {
    async function loadResourcesAndDataAsync() {
      try {
        // Load only the fonts the app actually renders with. Icon fonts
        // (Ionicons) load lazily on first use; FontAwesome/space-mono were
        // loaded here historically but are not used anywhere.
        await Font.loadAsync({
          Lora_400Regular,
          Lora_700Bold,
          CormorantGaramond_300Light,
        });
      } catch (e) {
        // We might want to provide this error information to an error reporting service
        console.warn(e);
      } finally {
        setLoadingComplete(true);
      }
    }

    loadResourcesAndDataAsync();
  }, []);

  return isLoadingComplete;
}
