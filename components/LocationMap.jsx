import React from "react";
import { Platform } from "react-native";

export default function LocationMap(props) {
  const Comp = Platform.OS === "web"
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    ? require("./LocationMap.web").default
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    : require("./LocationMap.native").default;
  return <Comp {...props} />;
}
