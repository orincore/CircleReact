import { useRouter } from 'expo-router';
import ImageEditor from '@/components/memes/ImageEditor';
import { getEditorInput, setEditorResult } from '@/components/memes/editorSession';

/**
 * Sibling stack screen (not nested in (tabs)), same reasoning as
 * meme-view.jsx: a full-screen modal takeover shouldn't be squeezed inside
 * another screen's own ScrollView/layout as an absolute-positioned overlay,
 * which is what made the first pass of this editor look broken. Input/
 * output cross this route boundary via editorSession.js, since expo-router
 * has no built-in way to return a value from a pushed screen.
 */
export default function MemeEditImageScreen() {
  const router = useRouter();
  const input = getEditorInput();

  return (
    <ImageEditor
      uri={input?.uri}
      onCancel={() => router.back()}
      onDone={(newUri) => {
        setEditorResult({ uri: newUri });
        router.back();
      }}
    />
  );
}
