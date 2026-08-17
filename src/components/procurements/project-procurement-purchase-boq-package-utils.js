export function normalizePurchaseBoqPackages(packages = [], packageCode = '') {
  if (Array.isArray(packages) && packages.length > 0) {
    return packages
      .map((entry) => {
        if (!entry) return null;
        if (typeof entry === 'string') {
          return { id: entry, code: entry, name: entry };
        }
        const code = entry.code || entry.id || '';
        return {
          id: entry.id || code,
          code,
          name: entry.name || code,
        };
      })
      .filter(Boolean);
  }

  const code = String(packageCode ?? '').trim();
  if (!code) return [];
  return code.split(',').map((value) => {
    const trimmed = value.trim();
    return { id: trimmed, code: trimmed, name: trimmed };
  });
}

export function createPurchaseBoqPackageFromInput(rawValue = '') {
  const name = String(rawValue ?? '').trim();
  if (!name) return null;

  const normalizedId = name.toLowerCase().replaceAll(/[^\da-z]+/g, '-');
  return {
    id: `new-package:${normalizedId}`,
    code: name,
    name,
    isNew: true,
  };
}

export function hasPurchaseBoqPackages(row = {}) {
  return normalizePurchaseBoqPackages(row.packages, row.packageCode).length > 0;
}
