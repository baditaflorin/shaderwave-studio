interface VersionBadgeProps {
  version: string;
  commit: string;
}

export function VersionBadge({ version, commit }: VersionBadgeProps) {
  return (
    <div className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
      <span>v{version}</span>
      <span className="h-1 w-1 rounded-full bg-slate-400" />
      <span>{commit}</span>
    </div>
  );
}
