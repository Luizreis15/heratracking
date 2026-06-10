import { toast } from "sonner";

export function toastError(message: string) {
  toast.error(message);
}

export function toastWarning(message: string) {
  toast.warning(message);
}

export function toastSuccess(message: string) {
  toast.success(message);
}
