import { Alert, IconButton } from "@chakra-ui/react";
import { LuX } from "react-icons/lu";

type ErrorMsgProps = {
  message: string;
  onClose?: () => void;
};

const ErrorMsg = ({ message, onClose }: ErrorMsgProps) => (
  <Alert.Root
    status="error"
    animation="fade-in 300ms ease-out"
    role="alert"
    aria-live="assertive"
    alignItems='center'
  >
    <Alert.Indicator />
    <Alert.Content>
      <Alert.Title>{message}</Alert.Title>
    </Alert.Content>
    {onClose && (
      <IconButton
        alignSelf="flex-start"
        aria-label="Dismiss error"
        variant="subtle"
        size="2xs"
        onClick={onClose}
      >
        <LuX />
      </IconButton>
    )}
  </Alert.Root>
);

export default ErrorMsg;
