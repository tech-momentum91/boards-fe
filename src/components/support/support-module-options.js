import { SUPPORT_MODULE_OPTIONS } from '@/components/support/support-feedback-constants';

const normalizeLabel = (value) => {
  const normalizedValue = String(value ?? '').trim();
  if (!normalizedValue) return '';
  if (normalizedValue.toLowerCase() === 'devx crm') return 'CRM';
  return normalizedValue;
};

const toModuleOption = (value) => {
  const label = normalizeLabel(value);
  if (!label) return null;
  return { label, value: label };
};

export const getSupportModuleOptions = (userSideBarPerm) => {
  const sidebarData = userSideBarPerm?.data?.message?.sidebar;
  if (!sidebarData || typeof sidebarData !== 'object') {
    return SUPPORT_MODULE_OPTIONS;
  }

  const moduleOptions = [];

  Object.entries(sidebarData).forEach(([parentKey, children]) => {
    const parentOption = toModuleOption(parentKey);
    if (parentOption) {
      moduleOptions.push(parentOption);
    }

    if (!Array.isArray(children)) return;
    children.forEach((childKey) => {
      const childOption = toModuleOption(childKey);
      if (childOption) {
        moduleOptions.push(childOption);
      }
    });
  });

  const dedupedOptions = moduleOptions.filter((option, index, allOptions) => {
    const firstMatch = allOptions.findIndex(
      (item) => item.value.toLowerCase() === option.value.toLowerCase(),
    );
    return firstMatch === index;
  });

  return dedupedOptions.length > 0 ? dedupedOptions : SUPPORT_MODULE_OPTIONS;
};
