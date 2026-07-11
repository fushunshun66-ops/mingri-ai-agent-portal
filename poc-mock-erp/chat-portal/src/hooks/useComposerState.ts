import { useCallback, useState } from "react";
import { api } from "../api/client";
import type { UploadedFile } from "../types/message";

export function useComposerState(activeId: string | null, setError: (msg: string | null) => void) {
  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState<UploadedFile[]>([]);
  const [localFiles, setLocalFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [homeMentionFlowKey, setHomeMentionFlowKey] = useState<string | null>(null);

  const handlePickFiles = useCallback(
    async (fileList: FileList | null) => {
      if (!fileList) return;
      setError(null);

      if (!activeId) {
        setLocalFiles((prev) => [...prev, ...Array.from(fileList)]);
        return;
      }

      setUploading(true);
      try {
        const uploaded: UploadedFile[] = [];
        for (const file of Array.from(fileList)) {
          uploaded.push(await api.uploadFile(activeId, file));
        }
        setAttachments((prev) => [...prev, ...uploaded]);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setUploading(false);
      }
    },
    [activeId, setError],
  );

  return {
    input, setInput,
    attachments, setAttachments,
    localFiles, setLocalFiles,
    uploading, setUploading,
    homeMentionFlowKey, setHomeMentionFlowKey,
    handlePickFiles,
  };
}