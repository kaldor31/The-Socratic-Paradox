import { createContext, useContext, useRef, useCallback, useEffect, useState, type ReactNode } from 'react';
import { decryptKey, deriveKey, importDataKey, exportKey } from '../utils/crypto';
import { useAuth } from './AuthContext';

interface EncryptionContextValue {
  dataKey: CryptoKey | null;
  isUnlocked: boolean;
  getDataKey: () => CryptoKey | null;
  unlock: (password: string) => Promise<void>;
  lock: () => void;
  setDataKey: (key: CryptoKey) => void;
}

const EncryptionContext = createContext<EncryptionContextValue | null>(null);

const STORAGE_KEY = 'sp-data-key';

export function EncryptionProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const dataKeyRef = useRef<CryptoKey | null>(null);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const previousUserRef = useRef(user);
  const userRef = useRef(user);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      importDataKey(stored)
        .then(key => {
          dataKeyRef.current = key;
          setIsUnlocked(true);
        })
        .catch(() => {
          localStorage.removeItem(STORAGE_KEY);
          setIsUnlocked(false);
        });
    }
  }, []);

  const setDataKey = useCallback(async (key: CryptoKey) => {
    dataKeyRef.current = key;
    setIsUnlocked(true);
    const raw = await exportKey(key);
    localStorage.setItem(STORAGE_KEY, raw);
  }, []);

  const lock = useCallback(() => {
    dataKeyRef.current = null;
    setIsUnlocked(false);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  useEffect(() => {
    const prev = previousUserRef.current;
    previousUserRef.current = user;
    if (prev && (!user || prev.id !== user.id)) {
      lock();
    }
  }, [user, lock]);

  const unlock = useCallback(async (password: string) => {
    const currentUser = userRef.current;
    if (!currentUser?.encryptionSalt || !currentUser?.encryptedDataKey) {
      throw new Error('No encryption key material available');
    }
    const kek = await deriveKey(password, currentUser.encryptionSalt);
    const key = await decryptKey(currentUser.encryptedDataKey, kek);
    dataKeyRef.current = key;
    setIsUnlocked(true);
    const raw = await exportKey(key);
    localStorage.setItem(STORAGE_KEY, raw);
  }, []);

  const getDataKey = useCallback(() => dataKeyRef.current, []);

  return (
    <EncryptionContext.Provider value={{ dataKey: dataKeyRef.current, isUnlocked, getDataKey, unlock, lock, setDataKey }}>
      {children}
    </EncryptionContext.Provider>
  );
}

export function useEncryption(): EncryptionContextValue {
  const context = useContext(EncryptionContext);
  if (!context) throw new Error('useEncryption must be used within EncryptionProvider');
  return context;
}
