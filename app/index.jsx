import { Redirect, useRouter } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import LandingPage from "@/components/LandingPage";

export default function Index() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return <Redirect href="/secure/match" />;
  }

  return (
    <LandingPage
      onSignUp={() => router.push("/signup")}
      onLogIn={() => router.push("/login")}
    />
  );
}
