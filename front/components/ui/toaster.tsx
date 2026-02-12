"use client";

import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast";
import { useToast } from "@/components/ui/use-toast";

function copyToastToClipboard(title?: string, description?: string) {
  const text = [title, description].filter(Boolean).join("\n");
  if (text && typeof navigator?.clipboard?.writeText === "function") {
    navigator.clipboard.writeText(text);
  }
}

export function Toaster() {
  const { toasts } = useToast();

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        return (
          <Toast key={id} {...props}>
            <div
              className="grid gap-1 cursor-pointer min-w-0 flex-1"
              onClick={() => copyToastToClipboard(title, description)}
              title="Кликните, чтобы скопировать"
              role="button"
              tabIndex={0}
              aria-label="Кликните, чтобы скопировать сообщение"
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  copyToastToClipboard(title, description);
                }
              }}
            >
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && (
                <ToastDescription>{description}</ToastDescription>
              )}
            </div>
            {action}
            <ToastClose />
          </Toast>
        );
      })}
      <ToastViewport />
    </ToastProvider>
  );
}
