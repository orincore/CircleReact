import { useRouter } from 'expo-router';
import VideoEditor from '@/components/memes/VideoEditor';
import { getEditorInput, setEditorResult } from '@/components/memes/editorSession';

// See meme-edit-image.jsx for why this is a separate route rather than an
// overlay, and how editorSession.js carries the input/output across it.
export default function MemeEditVideoScreen() {
  const router = useRouter();
  const input = getEditorInput();

  return (
    <VideoEditor
      uri={input?.uri}
      durationMs={input?.durationMs}
      onCancel={() => router.back()}
      onDone={(newUri) => {
        setEditorResult({ uri: newUri });
        router.back();
      }}
    />
  );
}
