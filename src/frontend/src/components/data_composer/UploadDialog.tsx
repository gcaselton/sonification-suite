import { useState } from "react";
import {
  Button,
  Checkbox,
  CloseButton,
  Dialog,
  Field,
  FileUpload,
  Input,
  Portal,
  VStack,
} from "@chakra-ui/react";
import ErrorMsg from "../ui/ErrorMsg";
import { composerAPI, coreAPI } from "../../apiConfig";
import { apiRequest } from "../../utils/requests";

interface UploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploadComplete: (
    fileName: string,
    fileRef: string,
  ) => void;
}

export default function UploadDialog({
  open,
  onOpenChange,
  onUploadComplete,
}: UploadDialogProps) {
  const [uploadReady, setUploadReady] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [pendingUpload, setPendingUpload] = useState<{
    fileRef: string;
    fileName: string;
  } | null>(null);

  const [uploadErrorMessage, setUploadErrorMessage] = useState("");
  const [hasHeader, setHasHeader] = useState(true);

  const handleFileAccept = async (files: FileList | File[]) => {
    setUploadErrorMessage("");
    setPendingUpload(null);
    setUploadReady(false);

    const file = files[0];

    if (!file) return;

    if (file.size > 1e7) {
      setUploadErrorMessage("File too large. Maximum size is 10MB.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`${coreAPI}/upload-data/`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!res.ok) {
        let message = `HTTP ${res.status}`;

        try {
          const errorData = await res.json();
          if (errorData?.detail) message = errorData.detail;
        } catch {}

        setUploadErrorMessage(message);
        return;
      }

      const result = await res.json();

      setPendingUpload({
        fileRef: result.file_ref,
        fileName: file.name.split(".")[0],
      });

      setUploadReady(true);
    } catch {
      setUploadErrorMessage("Failed to upload file. Please try again.");
    }
  };

  const handleSave = async () => {
    if (!pendingUpload) return;

    setUploading(true);

    try {
      const result = await apiRequest(`${composerAPI}/set-header/`, {
        file_ref: pendingUpload.fileRef,
        has_header: hasHeader,
      });

      onUploadComplete(
        pendingUpload.fileName,
        pendingUpload.fileRef,
      );

      setPendingUpload(null);
      setUploadReady(false);
      onOpenChange(false);
    } catch {
      setUploadErrorMessage("Error uploading data, please try another file.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={(e) => onOpenChange(e.open)}>
      <Portal>
        <Dialog.Backdrop />

        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>Upload data</Dialog.Title>
            </Dialog.Header>

            <Dialog.Body>
              <VStack gap={6}>
                <FileUpload.Root
                  accept={{ "*/*": [".csv"] }}
                  maxFiles={1}
                  maxFileSize={1e7}
                  onFileAccept={({ files }) => handleFileAccept(files)}
                  onFileReject={(details) =>
                    setUploadErrorMessage(
                      `File rejected: ${details.files[0].errors.join(", ")}`,
                    )
                  }
                >
                  <FileUpload.HiddenInput />

                  <Field.Root>
                    <Field.Label fontWeight="semibold">Upload file</Field.Label>

                    <Input asChild>
                      <FileUpload.Trigger>
                        <FileUpload.FileText />
                      </FileUpload.Trigger>
                    </Input>

                    <Field.HelperText>CSV only, up to 10MB.</Field.HelperText>
                  </Field.Root>
                </FileUpload.Root>

                {uploadErrorMessage && (
                  <ErrorMsg
                    message={uploadErrorMessage}
                    onClose={() => setUploadErrorMessage("")}
                  />
                )}

                <Checkbox.Root
                  colorPalette="teal"
                  variant="subtle"
                  checked={hasHeader}
                  onCheckedChange={(e) => setHasHeader(!!e.checked)}
                >
                  <Checkbox.HiddenInput />
                  <Checkbox.Control />
                  <Checkbox.Label fontWeight="semibold">
                    My data has a header row
                  </Checkbox.Label>
                </Checkbox.Root>
              </VStack>
            </Dialog.Body>

            <Dialog.Footer justifyContent="center">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>

              <Button
                colorPalette="teal"
                loading={uploading}
                disabled={!uploadReady}
                onClick={handleSave}
              >
                Save
              </Button>
            </Dialog.Footer>

            <Dialog.CloseTrigger asChild>
              <CloseButton size="sm" />
            </Dialog.CloseTrigger>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}
