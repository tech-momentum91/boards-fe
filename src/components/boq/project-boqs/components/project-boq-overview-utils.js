import { computeBoqProductsFinancialTotals } from '@/components/boq/boq-templates/components/boq-template-products-utils';
import { formatBoqRupeeAmount } from '@/components/boq/boq-templates/components/boq-template-product-master-utils';
import { PROJECT_BOQ_TYPES } from '@/components/boq/constants';

export const PROJECT_BOQ_OVERVIEW_FILTER_ALL = '__all__';

export function buildProjectBoqOverviewFilterOptions(familyMembers = []) {
  return [
    { id: PROJECT_BOQ_OVERVIEW_FILTER_ALL, label: 'All' },
    ...familyMembers.map((member) => ({
      id: member.code || member.id,
      label: member.badgeLabel || member.familyLabel || member.boqName || member.code,
      member,
    })),
  ];
}

export function resolveProjectBoqOverviewScope(filterId, familyMembers = []) {
  if (!filterId || filterId === PROJECT_BOQ_OVERVIEW_FILTER_ALL) {
    return familyMembers;
  }

  const member = familyMembers.find((row) => (row.code || row.id) === filterId);
  return member ? [member] : familyMembers;
}

export function computeOverviewMetricsFromMembers(members = []) {
  const buyTotal = members.reduce((sum, member) => sum + (Number(member.buyTotal) || 0), 0);
  const sellTotal = members.reduce((sum, member) => sum + (Number(member.sellTotal) || 0), 0);
  const marginTotal = sellTotal - buyTotal;
  const marginPercent = sellTotal > 0 ? Math.round((marginTotal / sellTotal) * 1000) / 10 : 0;

  return { buyTotal, sellTotal, marginTotal, marginPercent };
}

export function buildProjectBoqOverviewCostBreakdown(
  members = [],
  amountKey = 'buyTotal',
  fallbackTotal = 0,
) {
  const rows = (Array.isArray(members) ? members : []).map((member) => ({
    label: member.badgeLabel || member.familyLabel || member.boqName || member.code || 'BOQ',
    value: Number(member[amountKey]) || 0,
  }));

  if (rows.length === 0 && fallbackTotal > 0) {
    return [{ label: 'Total', value: fallbackTotal }];
  }

  const hasMemberValues = rows.some((row) => row.value > 0);
  if (!hasMemberValues && fallbackTotal > 0) {
    if (rows.length === 1) {
      return [{ ...rows[0], value: fallbackTotal }];
    }
    return [{ label: 'Total', value: fallbackTotal }];
  }

  return rows;
}

export function findDesignBoqMember(members = []) {
  return members.find((member) => member.boqType === PROJECT_BOQ_TYPES.DESIGN) ?? null;
}

export function formatProjectBoqOverviewSqft(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return '--';
  return `${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(Math.round(numeric))} Sq.ft`;
}

export function formatProjectBoqOverviewRupee(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return '₹0';
  return `₹${Math.round(amount).toLocaleString('en-IN')}`;
}

export function formatProjectBoqOverviewPerSqft(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) return '₹0';
  return `₹${Math.round(amount).toLocaleString('en-IN')}`;
}

export function formatProjectBoqOverviewTablePerSqft(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) return '₹ 0';
  return `₹ ${Math.round(amount).toLocaleString('en-IN')}`;
}

export function formatProjectBoqOverviewTableTotal(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) return '₹ 0';

  if (amount >= 1_00_00_000) {
    return `₹ ${(amount / 1_00_00_000).toFixed(2)} Cr`;
  }

  if (amount >= 1_00_000) {
    return `₹ ${(amount / 1_00_000).toFixed(2)} L`;
  }

  return `₹ ${Math.round(amount).toLocaleString('en-IN')}`;
}

export function formatProjectBoqOverviewPercent(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return '0%';
  return `${numeric.toFixed(2)}%`;
}

export function buildProjectBoqOverviewCategoryRows(products = [], totalSqft = 0) {
  const categoryMap = new Map();

  for (const row of products) {
    const categoryKey =
      row.categoryType || row.category_type || row.categoryId || row.categoryGroup || 'other';
    if (!categoryMap.has(categoryKey)) {
      categoryMap.set(categoryKey, {
        categoryId: categoryKey,
        label: row.categoryType ?? row.category_type ?? categoryKey,
        products: [],
      });
    }
    categoryMap.get(categoryKey).products.push(row);
  }

  return [...categoryMap.values()].map((category) => {
    const totals = computeBoqProductsFinancialTotals(category.products);
    const clientTotalCost = totals.sellTotal ?? 0;
    const internalTotalCost = totals.buyTotal ?? 0;
    const clientCostPerSqft = totalSqft > 0 ? clientTotalCost / totalSqft : 0;
    const internalCostPerSqft = totalSqft > 0 ? internalTotalCost / totalSqft : 0;
    const marginCost = clientTotalCost - internalTotalCost;
    const marginPercent =
      clientTotalCost > 0 ? Math.round((marginCost / clientTotalCost) * 1000) / 10 : 0;

    return {
      id: category.categoryId,
      item: category.label,
      clientCostPerSqft,
      clientTotalCost,
      internalCostPerSqft,
      internalTotalCost,
      marginPercent,
      marginCost,
    };
  });
}

export function normalizeProjectBoqOverviewResponse(payload = {}) {
  if (!payload || typeof payload !== 'object') {
    return buildProjectBoqOverviewSummary([], [], []);
  }

  return {
    totalSqft: Number(payload.totalSqft) || 0,
    buyTotal: Number(payload.buyTotal) || 0,
    sellTotal: Number(payload.sellTotal) || 0,
    marginTotal: Number(payload.marginTotal) || 0,
    marginPercent: Number(payload.marginPercent) || 0,
    designBoqCost: Number(payload.designBoqCost) || 0,
    internalCostPerSqft: Number(payload.internalCostPerSqft) || 0,
    clientCostPerSqft: Number(payload.clientCostPerSqft) || 0,
    costMarginTarget: Number(payload.costMarginTarget) || 30,
    categoryRows: Array.isArray(payload.categoryRows) ? payload.categoryRows : [],
    differenceCost: Number(payload.differenceCost) || 0,
    projectTotalCost: Number(payload.projectTotalCost) || 0,
    projectCostPerSqft: Number(payload.projectCostPerSqft) || 0,
    revenueMargin: Number(payload.revenueMargin) || 0,
    internalCostBreakdown: Array.isArray(payload.internalCostBreakdown)
      ? payload.internalCostBreakdown
      : [],
    clientCostBreakdown: Array.isArray(payload.clientCostBreakdown)
      ? payload.clientCostBreakdown
      : [],
    boqTypeBreakdown: Array.isArray(payload.boqTypeBreakdown) ? payload.boqTypeBreakdown : [],
    selectedVersionCode: String(payload.selectedVersionCode ?? ''),
    versionOptions: Array.isArray(payload.versionOptions) ? payload.versionOptions : [],
  };
}

export function buildProjectBoqOverviewSummary(products = [], members = [], projectCarpetArea = 0) {
  const productTotals = computeBoqProductsFinancialTotals(products);
  const parsedSqft = Number.parseFloat(String(projectCarpetArea ?? '').replaceAll(',', ''));
  const totalSqft = Number.isFinite(parsedSqft) && parsedSqft > 0 ? parsedSqft : 0;

  const buyTotal = productTotals.buyTotal;
  const sellTotal = productTotals.sellTotal;
  const marginTotal = sellTotal - buyTotal;
  const marginPercent = sellTotal > 0 ? Math.round((marginTotal / sellTotal) * 1000) / 10 : 0;

  const designMember = findDesignBoqMember(members);
  const designBoqCost = designMember ? Number(designMember.sellTotal) || 0 : 0;

  const internalCostPerSqft = totalSqft > 0 ? buyTotal / totalSqft : 0;
  const clientCostPerSqft = totalSqft > 0 ? sellTotal / totalSqft : 0;

  return {
    totalSqft,
    buyTotal,
    sellTotal,
    marginTotal,
    marginPercent,
    designBoqCost,
    internalCostPerSqft,
    clientCostPerSqft,
    costMarginTarget: 30,
    categoryRows: buildProjectBoqOverviewCategoryRows(products, totalSqft),
    differenceCost: marginTotal,
    projectTotalCost: sellTotal,
    projectCostPerSqft: clientCostPerSqft,
    revenueMargin: marginPercent,
  };
}

export { formatBoqRupeeAmount };
