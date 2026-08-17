/**
 * Page-plan read/mutate helpers for the proposal builder UI.
 *
 * Page-plan *construction* lives only on the backend
 * (`devx.devx_crm.proposal_page_plan.build_schema_v3_deck`).
 */

export function flattenPagePlan(pagePlan, options = {}) {
  const enabledOnly = options.enabledOnly === true;
  const flat = [];

  const pushInstance = (instance) => {
    if (!instance) return;
    if (enabledOnly && !instance.enabled) return;
    flat.push(instance);
  };

  (pagePlan?.prefix ?? []).forEach(pushInstance);
  (pagePlan?.cities ?? []).forEach((city) => {
    pushInstance(city.page);
    (city.centers ?? []).forEach((center) => {
      (center.pages ?? []).forEach(pushInstance);
    });
  });
  (pagePlan?.suffix ?? []).forEach(pushInstance);

  return flat;
}

export function findPageInstance(pagePlan, instanceId) {
  if (!instanceId) return null;
  return flattenPagePlan(pagePlan).find((instance) => instance.id === instanceId) ?? null;
}

export function setPageInstanceEnabled(pagePlan, instanceId, enabled) {
  if (!pagePlan || !instanceId) return pagePlan;
  const nextEnabled = Boolean(enabled);

  const updateInstances = (instances) => {
    let changed = false;
    const next = instances.map((instance) => {
      if (instance.id !== instanceId) return instance;
      if (instance.enabled === nextEnabled) return instance;
      changed = true;
      return { ...instance, enabled: nextEnabled };
    });
    return changed ? next : instances;
  };

  // Preserve missing prefix/suffix shapes (do not coerce undefined → []).
  const nextPrefix = Array.isArray(pagePlan.prefix)
    ? updateInstances(pagePlan.prefix)
    : pagePlan.prefix;
  const nextSuffix = Array.isArray(pagePlan.suffix)
    ? updateInstances(pagePlan.suffix)
    : pagePlan.suffix;

  let citiesChanged = false;
  const nextCities = Array.isArray(pagePlan.cities)
    ? pagePlan.cities.map((city) => {
        let cityChanged = false;
        const nextPage = updateInstances([city.page])[0];
        if (nextPage !== city.page) cityChanged = true;

        const nextCenters = (city.centers ?? []).map((center) => {
          const nextPages = updateInstances(center.pages ?? []);
          if (nextPages !== center.pages) {
            cityChanged = true;
            return { ...center, pages: nextPages };
          }
          return center;
        });

        if (!cityChanged) return city;
        citiesChanged = true;
        return { ...city, page: nextPage, centers: nextCenters };
      })
    : pagePlan.cities;

  const changed = nextPrefix !== pagePlan.prefix || nextSuffix !== pagePlan.suffix || citiesChanged;

  if (!changed) return pagePlan;
  return {
    ...pagePlan,
    prefix: nextPrefix,
    suffix: nextSuffix,
    cities: nextCities,
  };
}

export function reorderCityGroup(pagePlan, sourceId, targetId) {
  if (!pagePlan || !sourceId || !targetId || sourceId === targetId) return pagePlan;
  const cities = pagePlan.cities ?? [];
  const sourceIndex = cities.findIndex((city) => city.id === sourceId);
  const targetIndex = cities.findIndex((city) => city.id === targetId);
  if (sourceIndex < 0 || targetIndex < 0) return pagePlan;

  const nextCities = [...cities];
  const [moved] = nextCities.splice(sourceIndex, 1);
  nextCities.splice(targetIndex, 0, moved);
  return {
    ...pagePlan,
    cities: nextCities,
  };
}

export function reorderCenterWithinCity(pagePlan, cityId, sourceId, targetId) {
  if (!pagePlan || !cityId || !sourceId || !targetId || sourceId === targetId) {
    return pagePlan;
  }

  const cityIndex = (pagePlan.cities ?? []).findIndex((city) => city.id === cityId);
  if (cityIndex < 0) return pagePlan;

  const city = pagePlan.cities[cityIndex];
  const centers = city.centers ?? [];
  const sourceIndex = centers.findIndex((center) => center.id === sourceId);
  const targetIndex = centers.findIndex((center) => center.id === targetId);
  if (sourceIndex < 0 || targetIndex < 0) return pagePlan;

  const nextCenters = [...centers];
  const [moved] = nextCenters.splice(sourceIndex, 1);
  nextCenters.splice(targetIndex, 0, moved);

  const nextCities = [...pagePlan.cities];
  nextCities[cityIndex] = { ...city, centers: nextCenters };

  return {
    ...pagePlan,
    cities: nextCities,
  };
}
