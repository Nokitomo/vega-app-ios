export const formatName = (name: string): string => {
  // Replace special characters with an underscore
  return name.replaceAll(/[^a-zA-Z0-9]/g, '_');
};

export const hasItaBadge = (title?: string): boolean =>
  /\(\s*ita\s*\)/i.test(title || '');
