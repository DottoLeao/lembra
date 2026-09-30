import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import type { BackupFs } from '../data/autoBackup';

const FOLDER = 'Lembra';

async function ensurePermission(): Promise<void> {
  const status = await Filesystem.checkPermissions();
  if (status.publicStorage !== 'granted') await Filesystem.requestPermissions();
}

export const nativeBackupFs: BackupFs = {
  async list() {
    try {
      const result = await Filesystem.readdir({ path: FOLDER, directory: Directory.Documents });
      return result.files.map((f) => f.name);
    } catch {
      return []; // pasta ainda não existe
    }
  },
  async write(name, data) {
    await ensurePermission();
    await Filesystem.writeFile({
      path: `${FOLDER}/${name}`,
      data,
      directory: Directory.Documents,
      encoding: Encoding.UTF8,
      recursive: true,
    });
  },
  async remove(name) {
    await Filesystem.deleteFile({ path: `${FOLDER}/${name}`, directory: Directory.Documents });
  },
};
