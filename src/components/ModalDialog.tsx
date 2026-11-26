import React, { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';

interface ModalDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  maxWidthClass?: string;
  children: React.ReactNode;
}

export const ModalDialog: React.FC<ModalDialogProps> = ({
  open,
  onClose,
  title,
  maxWidthClass = 'max-w-xl',
  children,
}) => {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const titleId = useId();
  const pressedOutsideRef = useRef(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  const handleClose = () => {
    const dialog = dialogRef.current;
    if (dialog) {
      dialog.returnValue = '';
    }
    onClose();
  };

  // Fallback light-dismiss for browsers without native <dialog closedby="any">
  const isOutside = (e: React.PointerEvent<HTMLDialogElement>, el: HTMLDialogElement) => {
    const r = el.getBoundingClientRect();
    return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
  };

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      {...({ closedby: 'any' } as Record<string, string>)}
      onClose={handleClose}
      onPointerDown={(e) => {
        if (dialogRef.current) {
          pressedOutsideRef.current = isOutside(e, dialogRef.current);
        }
      }}
      onPointerUp={(e) => {
        if (dialogRef.current && pressedOutsideRef.current && isOutside(e, dialogRef.current)) {
          dialogRef.current.close();
        }
        pressedOutsideRef.current = false;
      }}
      className={`w-[calc(100vw-1.5rem)] ${maxWidthClass} bg-[#FAF6EE] text-[#151412] border border-[#B89246]/30 rounded-2xl overflow-hidden`}
    >
      <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-[#B89246]/20 bg-[#FFFFFF]/80">
        <h1 id={titleId} className="text-lg font-bold tracking-tight text-[#151412]">
          {title}
        </h1>
        <button
          type="button"
          onClick={() => dialogRef.current?.close()}
          aria-label="Close"
          className="inline-flex items-center justify-center w-10 h-10 rounded-full text-[#524b40] hover:text-[#151412] hover:bg-[#151412]/5 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
      <div className="p-6 max-h-[calc(90dvh-4.5rem)] overflow-y-auto">{children}</div>
    </dialog>
  );
};
