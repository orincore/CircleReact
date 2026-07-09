import { Stack } from "expo-router";
import { View } from "react-native";
import { useVoiceCall } from "@/src/hooks/useVoiceCall";
import { usePromptMatching } from "@/src/hooks/usePromptMatching";
import GiverRequestModal from "@/components/GiverRequestModal";
import DateOfBirthMigrationModal from "@/components/DateOfBirthMigrationModal";
import { JamSessionProvider } from "@/contexts/JamSessionContext";

export default function SecureLayout() {
  // Initialize voice call service for all logged-in users
  useVoiceCall();
  
  // Initialize prompt matching socket listeners globally
  const { incomingRequest, respondToRequest, dismissIncomingRequest } = usePromptMatching();

  const handleAcceptRequest = async () => {
    if (!incomingRequest) return;
    try {
      await respondToRequest(incomingRequest.requestId, true);
      dismissIncomingRequest();
    } catch (error) {
      console.error('Error accepting request:', error);
    }
  };

  const handleDeclineRequest = async () => {
    if (!incomingRequest) return;
    try {
      await respondToRequest(incomingRequest.requestId, false);
      dismissIncomingRequest();
    } catch (error) {
      console.error('Error declining request:', error);
    }
  };

  return (
    // Mounted here (wrapping the whole authenticated Stack) rather than per-screen, so a
    // jam session's audio survives navigating anywhere else in the app — other chats, tabs,
    // memes — instead of tearing down the moment the chat screen that started it unmounts.
    // See JamSessionContext's activeChat for how it tracks which chat's session to follow
    // without a chat-scoped mount to key off of anymore. The mini player bar itself (see
    // JamMiniPlayerBar) is placed inline by individual screens rather than floating
    // globally from here — chat-conversation, the chat list, explore and match each embed
    // it in their own specific spot; it renders nothing on any screen that doesn't.
    <JamSessionProvider>
      <View style={{ flex: 1 }}>
        <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen
          name="(tabs)"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="chat-conversation"
          options={{
            headerShown: false,
            presentation: 'card',
            animation: 'slide_from_right'
          }}
        />
        <Stack.Screen
          name="meme-view"
          options={{
            headerShown: false,
            presentation: 'card',
            animation: 'slide_from_right'
          }}
        />
        <Stack.Screen
          name="location"
          options={{
            headerShown: false,
            presentation: 'card',
            animation: 'slide_from_right'
          }}
        />
        <Stack.Screen
          name="voice-call"
          options={{
            headerShown: false,
            presentation: 'fullScreenModal',
            animation: 'slide_from_bottom'
          }}
        />
      </Stack>

        {/* Global Giver Request Modal - shows incoming help requests on any screen */}
        <GiverRequestModal
          visible={!!incomingRequest}
          onClose={dismissIncomingRequest}
          onAccept={handleAcceptRequest}
          onDecline={handleDeclineRequest}
          requestData={incomingRequest}
        />

        {/* Blocking date-of-birth migration prompt for existing users */}
        <DateOfBirthMigrationModal />
      </View>
    </JamSessionProvider>
  );
}
