import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Share } from 'react-native';

/** Export the agent's contact as a vCard (§6.4). Falls back to text share. */
export async function shareVCard(p: {
  name: string;
  phone?: string | null;
  email?: string | null;
  org?: string;
  url: string;
}) {
  const lines = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `N:${p.name}`,
    `FN:${p.name}`,
    `ORG:${p.org ?? 'JAMIN Properties'}`,
    p.phone ? `TEL;TYPE=CELL:${p.phone}` : '',
    p.email ? `EMAIL:${p.email}` : '',
    `URL:${p.url}`,
    'END:VCARD',
    '',
  ].filter(Boolean);
  const vcf = lines.join('\n');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dir = (FileSystem as any).cacheDirectory as string | undefined;
  try {
    if (dir && (FileSystem as any).writeAsStringAsync) {
      const uri = `${dir}jamin-contact.vcf`;
      await (FileSystem as any).writeAsStringAsync(uri, vcf);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'text/vcard', UTI: 'public.vcard', dialogTitle: 'Save contact' });
        return;
      }
    }
  } catch {
    // fall through to text share
  }
  await Share.share({ message: vcf });
}
