/** Format ISO timestamp for version picker labels. */
export function formatProposalVersionTime(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

/** Label for the active version chip in the header. */
export function getActiveProposalVersionLabel(versions, activeVersionId) {
  const active = versions.find((v) => v.name === activeVersionId);
  if (active?.label) return active.label;
  if (versions.length === 0) return 'Draft';
  return 'Select version';
}

/** Count versions that would be removed when reverting to the target version. */
export function countVersionsAfterTarget(versions, targetVersionName) {
  const target = versions.find((v) => v.name === targetVersionName);
  if (!target?.version_no) return 0;
  return versions.filter((v) => v.version_no > target.version_no).length;
}

/** True when selecting this version requires a destructive revert confirmation. */
export function versionRequiresRevertConfirm(versions, targetVersionName) {
  const latest = versions[0];
  const target = versions.find((v) => v.name === targetVersionName);
  if (!latest || !target) return false;
  return target.version_no < latest.version_no;
}
