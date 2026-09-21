interface PaginationProps {
  page: number;
  size: number;
  total: number;
  onChange: (page: number) => void;
}

export function Pagination({ page, size, total, onChange }: PaginationProps) {
  const pages = Math.max(1, Math.ceil(total / size));
  const from = total === 0 ? 0 : (page - 1) * size + 1;
  const to = Math.min(total, page * size);
  return (
    <div className="flex items-center justify-between border-t border-slate-200 px-4 py-2 text-sm text-slate-600">
      <span>
        총 {total.toLocaleString()}건 중 {from}–{to}
      </span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          className="btn-secondary px-2 py-1"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
        >
          이전
        </button>
        <span className="px-2">
          {page} / {pages}
        </span>
        <button
          type="button"
          className="btn-secondary px-2 py-1"
          disabled={page >= pages}
          onClick={() => onChange(page + 1)}
        >
          다음
        </button>
      </div>
    </div>
  );
}
