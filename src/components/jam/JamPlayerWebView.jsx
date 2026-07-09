import React, { forwardRef } from "react";
import { Platform } from "react-native";

const JamPlayerWebView = forwardRef(function JamPlayerWebView(props, ref) {
  const Comp = Platform.OS === "web"
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    ? require("./JamPlayerWebView.web").default
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    : require("./JamPlayerWebView.native").default;
  return <Comp {...props} ref={ref} />;
});

export default JamPlayerWebView;
