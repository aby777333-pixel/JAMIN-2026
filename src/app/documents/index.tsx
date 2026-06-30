import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, View } from 'react-native';

import { BackHeader } from '@/components/ui/BackHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useAddDocument, useDocMutations, useMyDocuments } from '@/features/documents/hooks';
import { color } from '@/theme/tokens';
import { errMessage } from '@/lib/errors';

const KINDS = ['agreement', 'id', 'kyc', 'document'];

/** Document Vault — keep agreements, IDs and KYC docs in one place. */
export default function Documents() {
  const { data: docs = [], isLoading } = useMyDocuments();
  const add = useAddDocument();
  const { setSign, remove } = useDocMutations();
  const [title, setTitle] = useState('');
  const [kind, setKind] = useState('agreement');

  async function pickAndUpload() {
    if (!title.trim()) {
      Alert.alert('Name it first', 'Give the document a title, then choose the file.');
      return;
    }
    const res = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
    if (res.canceled || !res.assets?.[0]) return;
    const a = res.assets[0];
    try {
      await add.mutateAsync({ title: title.trim(), kind, uri: a.uri, name: a.name, mimeType: a.mimeType });
      setTitle('');
      Alert.alert('Saved', 'Document added to your vault.');
    } catch (e) {
      Alert.alert('Upload failed', errMessage(e));
    }
  }

  return (
    <Screen contentClassName="pb-10 gap-4" keyboardAvoiding>
      <BackHeader title="Document vault" />
      <Text variant="caption">Securely store agreements, IDs and KYC documents for your deals.</Text>

      <Card className="gap-3">
        <Text variant="title" className="text-[14px]">Add a document</Text>
        <Input label="Title" placeholder="e.g. Sale agreement" value={title} onChangeText={setTitle} />
        <View className="flex-row flex-wrap gap-2">
          {KINDS.map((k) => (
            <Chip key={k} label={k} active={kind === k} onPress={() => setKind(k)} />
          ))}
        </View>
        <Button title={add.isPending ? 'Uploading…' : 'Choose file & upload'} loading={add.isPending} onPress={pickAndUpload} />
      </Card>

      {isLoading ? (
        <ActivityIndicator color={color.red} />
      ) : docs.length === 0 ? (
        <EmptyState icon="folder-open" title="No documents yet" body="Add agreements, IDs or KYC docs to keep them handy and shareable." />
      ) : (
        docs.map((d) => (
          <Card key={d.id} className="gap-2">
            <View className="flex-row items-center gap-3">
              <Ionicons name="document-text" size={20} color={color.red} />
              <Pressable className="flex-1" onPress={() => Linking.openURL(d.doc_url)}>
                <Text variant="title" className="text-[14px]" numberOfLines={1}>{d.title}</Text>
                <Text variant="caption" className="capitalize">{d.kind} · {new Date(d.created_at).toLocaleDateString('en-IN')}</Text>
              </Pressable>
              <Pressable onPress={() => remove.mutate(d.id)} hitSlop={8}>
                <Ionicons name="trash-outline" size={18} color={color.muted} />
              </Pressable>
            </View>
            <View className="flex-row items-center gap-2">
              <View className={`rounded-full px-2 py-0.5 ${d.sign_status === 'signed' ? 'bg-success/15' : d.sign_status === 'requested' ? 'bg-warn/15' : 'bg-ink/10'}`}>
                <Text className={`text-[10px] font-bold uppercase ${d.sign_status === 'signed' ? 'text-success' : d.sign_status === 'requested' ? 'text-warn' : 'text-muted'}`}>
                  {d.sign_status === 'none' ? 'unsigned' : d.sign_status}
                </Text>
              </View>
              {d.sign_status === 'none' ? (
                <Pressable onPress={() => setSign.mutate({ id: d.id, status: 'requested' })} hitSlop={6}>
                  <Text variant="caption" className="text-red">Request e-sign</Text>
                </Pressable>
              ) : d.sign_status === 'requested' ? (
                <Pressable onPress={() => setSign.mutate({ id: d.id, status: 'signed' })} hitSlop={6}>
                  <Text variant="caption" className="text-success">Mark signed</Text>
                </Pressable>
              ) : null}
            </View>
          </Card>
        ))
      )}
      <Text variant="caption" className="text-muted">
        e-Signature is tracked here; integrated signing (DocuSign/Leegality) can be enabled later.
      </Text>
    </Screen>
  );
}
