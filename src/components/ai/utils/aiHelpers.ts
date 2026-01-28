export const getProjectName = (currentWorkspace: string | null): string => {
  if (!currentWorkspace) return 'Cognitive';
  const name = currentWorkspace.replace(/[/\\]$/, '').split(/[/\\]/).pop() || 'Cognitive';

  return name.split(/[-_]/)
    .map(part => {
      const clean = part.replace(/\s/g, '');
      if (!clean) return '';
      return clean.charAt(0).toUpperCase() + clean.slice(1);
    })
    .join('') || 'Cognitive';
};

export const formatTimeAgo = (timestamp: number): string => {
  const diff = Date.now() - timestamp;
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return `${secs}s`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
};
