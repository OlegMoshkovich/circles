/**
 * Learn more about deep linking with React Navigation
 * https://reactnavigation.org/docs/deep-linking
 * https://reactnavigation.org/docs/configuring-links
 */

import { LinkingOptions } from "@react-navigation/native";
import * as Linking from "expo-linking";

import { RootStackParamList } from "../types";

const linking: LinkingOptions<RootStackParamList> = {
  // Accept both the custom scheme (valmia://) and the https universal links.
  // Universal links only reach the app once valmia.ch is verified via
  // apple-app-site-association / assetlinks.json (see lib/shareLinks.ts).
  prefixes: [
    Linking.createURL("/"),
    "https://valmia.ch",
    "https://www.valmia.ch",
  ],
  config: {
    screens: {
      Home: "home",
      // Shared content links: /event/:id and /circle/:id. The detail screens
      // fetch the record by id when opened this way (only id is present).
      EventDetail: "event/:id",
      CircleDetail: "circle/:id",
      Root: {
        screens: {
          SignUp: {
            screens: {
              SignUpScreen: "SignUp",
            },
          },
          SignIn: {
            screens: {
              SignInScreen: "SignIn",
            },
          },
        },
      },
    },
  },
};

export default linking;
