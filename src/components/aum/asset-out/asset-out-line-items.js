const DEFAULT_PRODUCT_TYPE = 'Other';

export function createEmptyAssetOutLineItem() {
  return {
    id: `line-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    assetId: '',
    assetCode: '',
    barcode: '',
    product: '',
    productType: '',
    image: '',
    unitValue: '',
    issued: '',
    remarks: '',
  };
}

export function buildLineFromAsset(asset) {
  if (!asset) return createEmptyAssetOutLineItem();
  const unitValue =
    typeof asset.unitValue === 'number'
      ? asset.unitValue >= 100000
        ? `₹${(asset.unitValue / 100000).toFixed(1)} L`
        : `₹${asset.unitValue.toLocaleString('en-IN')}`
      : asset.unitValue || '';
  return {
    id: `line-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    assetId: asset.assetId,
    assetCode: asset.assetCode,
    barcode: asset.barcode,
    product: asset.product,
    productType: asset.productType || DEFAULT_PRODUCT_TYPE,
    image: asset.image || '',
    unitValue,
    issued: '1',
    remarks: '',
  };
}

export function getSelectedAssetIdSet(lineItems = []) {
  return new Set(
    lineItems
      .filter((row) => row.assetId && String(row.issued ?? '').trim() === '1')
      .map((row) => row.assetId),
  );
}

export function filterAssetOutCatalog(assets = [], { search = '', productFilter = 'all' } = {}) {
  const query = String(search ?? '')
    .trim()
    .toLowerCase();
  return assets.filter((asset) => {
    const productType = asset.productType || DEFAULT_PRODUCT_TYPE;
    if (productFilter && productFilter !== 'all' && productType !== productFilter) {
      return false;
    }
    if (!query) return true;
    return (
      String(asset.product ?? '')
        .toLowerCase()
        .includes(query) ||
      String(productType).toLowerCase().includes(query) ||
      String(asset.assetCode ?? '')
        .toLowerCase()
        .includes(query) ||
      String(asset.barcode ?? '')
        .toLowerCase()
        .includes(query)
    );
  });
}

export function groupAssetsByProductType(assets = []) {
  const groups = new Map();

  for (const asset of assets) {
    const productType = asset.productType || DEFAULT_PRODUCT_TYPE;
    if (!groups.has(productType)) {
      groups.set(productType, []);
    }
    groups.get(productType).push(asset);
  }

  return [...groups.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([productType, groupAssets]) => ({
      productType,
      assets: groupAssets,
    }));
}

export function groupLineItemsByProductType(lineItems = []) {
  const groups = new Map();

  for (const line of lineItems) {
    const productType = line.productType || DEFAULT_PRODUCT_TYPE;
    if (!groups.has(productType)) {
      groups.set(productType, []);
    }
    groups.get(productType).push(line);
  }

  return [...groups.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([productType, lines]) => ({
      productType,
      lines,
    }));
}

export function toggleAssetInLineItems(lineItems = [], asset, selected) {
  if (!selected) {
    return lineItems.filter((row) => row.assetId !== asset.assetId);
  }

  const existing = lineItems.find((row) => row.assetId === asset.assetId);
  if (existing) {
    return lineItems.map((row) => (row.assetId === asset.assetId ? { ...row, issued: '1' } : row));
  }

  return [...lineItems, buildLineFromAsset(asset)];
}

export function toggleAllAssetsInLineItems(lineItems = [], assets = [], selectAll) {
  if (!selectAll) {
    const visibleIds = new Set(assets.map((asset) => asset.assetId));
    return lineItems.filter((row) => !visibleIds.has(row.assetId));
  }

  const selectedIds = getSelectedAssetIdSet(lineItems);
  const next = [...lineItems];
  for (const asset of assets) {
    if (!selectedIds.has(asset.assetId)) {
      next.push(buildLineFromAsset(asset));
    }
  }
  return next;
}

export function summarizeAssetOutLineItems(lineItems = []) {
  const selected = lineItems.filter((row) => row.assetId);
  const outCount = selected.filter((row) => String(row.issued ?? '').trim() === '1').length;
  return {
    assetCount: selected.length,
    issuedLabel: String(outCount),
  };
}

export function computeTotalsFromLineItems(lineItems = []) {
  let qty = 0;
  let totalValue = 0;

  for (const row of lineItems) {
    if (!row.assetId || String(row.issued ?? '').trim() !== '1') continue;
    qty += 1;

    const unit = Number(String(row.unitValue || '').replaceAll(/[^\d.]/g, ''));
    if (Number.isFinite(unit) && unit > 0) {
      totalValue += unit;
    }
  }

  const value =
    totalValue >= 100000
      ? `₹${(totalValue / 100000).toFixed(1)} L`
      : qty
        ? `₹${totalValue.toLocaleString('en-IN')}`
        : '₹0';

  return { qty, value };
}
