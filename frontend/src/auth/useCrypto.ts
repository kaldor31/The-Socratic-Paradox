import { useCallback } from 'react';
import { encryptData, decryptData } from '../utils/crypto';
import { useEncryption } from './EncryptionContext';

export function useCrypto() {
  const { getDataKey } = useEncryption();

  const encrypt = useCallback(
    async (plaintext: string): Promise<string> => {
      const key = getDataKey();
      if (!key) throw new Error('Encryption key not available');
      return encryptData(plaintext, key);
    },
    [getDataKey]
  );

  const decrypt = useCallback(
    async (ciphertext: string): Promise<string> => {
      const key = getDataKey();
      if (!key) throw new Error('Encryption key not available');
      return decryptData(ciphertext, key);
    },
    [getDataKey]
  );

  return { encrypt, decrypt };
}
