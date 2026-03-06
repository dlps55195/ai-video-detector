interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  label?: string;
}

export default function LoadingSpinner({ size = 'md', label }: LoadingSpinnerProps) {
  const sizeMap = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <div className={`${sizeMap[size]} relative`}>
        <div
          className={`${sizeMap[size]} rounded-full border-2 border-border border-t-amber-glow animate-spin`}
        />
      </div>
      {label && (
        <span className="font-mono text-xs text-slate-500 tracking-wider">{label}</span>
      )}
    </div>
  );
}