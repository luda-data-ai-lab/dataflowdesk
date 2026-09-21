interface AlertProps {
  kind: 'error' | 'success' | 'info';
  message: string;
  onClose?: () => void;
}

const STYLES = {
  error: 'bg-red-50 text-red-700 border-red-200',
  success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  info: 'bg-blue-50 text-blue-700 border-blue-200',
};

export function Alert({ kind, message, onClose }: AlertProps) {
  return (
    <div
      className={`flex items-start justify-between gap-3 rounded-md border px-3 py-2 text-sm ${STYLES[kind]}`}
      role="alert"
    >
      <span>{message}</span>
      {onClose && (
        <button type="button" onClick={onClose} aria-label="닫기" className="opacity-70">
          ✕
        </button>
      )}
    </div>
  );
}
