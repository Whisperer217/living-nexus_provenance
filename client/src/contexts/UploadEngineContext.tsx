import React, { createContext, useContext, useState, useCallback } from "react";

interface UploadEngineContextValue {
  isOpen: boolean;
  openEngine: (files?: File[]) => void;
  closeEngine: () => void;
  pendingFiles: File[];
  clearPending: () => void;
}

const UploadEngineContext = createContext<UploadEngineContextValue>({
  isOpen: false,
  openEngine: () => {},
  closeEngine: () => {},
  pendingFiles: [],
  clearPending: () => {},
});

export function UploadEngineProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);

  const openEngine = useCallback((files?: File[]) => {
    if (files && files.length > 0) setPendingFiles(files);
    setIsOpen(true);
  }, []);

  const closeEngine = useCallback(() => {
    setIsOpen(false);
  }, []);

  const clearPending = useCallback(() => {
    setPendingFiles([]);
  }, []);

  return (
    <UploadEngineContext.Provider value={{ isOpen, openEngine, closeEngine, pendingFiles, clearPending }}>
      {children}
    </UploadEngineContext.Provider>
  );
}

export function useUploadEngine() {
  return useContext(UploadEngineContext);
}
