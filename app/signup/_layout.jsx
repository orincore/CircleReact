import { Stack } from "expo-router";
import React, { createContext, useMemo, useState } from "react";

export const SignupWizardContext = createContext(undefined);

export default function SignupLayout() {
  const [data, setData] = useState({
    firstName: "",
    lastName: "",
    age: "",
    gender: "",
    username: "",
    password: "",
    email: "",
    countryCode: "+1",
    phoneNumber: "",
    interests: [],
    needs: [],
  });

  const ctx = useMemo(() => ({ data, setData }), [data]);

  return (
    <SignupWizardContext.Provider value={ctx}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="contact" />
        <Stack.Screen name="interests" />
        <Stack.Screen name="summary" />
      </Stack>
    </SignupWizardContext.Provider>
  );
}
