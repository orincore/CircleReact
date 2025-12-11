import { Stack } from "expo-router";
import { View } from "react-native";
import { useVoiceCall } from "@/src/hooks/useVoiceCall";
import { usePromptMatching } from "@/src/hooks/usePromptMatching";
import GiverRequestModal from "@/components/GiverRequestModal";

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
    </View>
  );
}
