import { format, parseISO, isValid } from 'date-fns';

/**
 * Maps ACL Task `as_dict()` (update response) onto the row shape from `get_acl_task_list`,
 * so Redux `{ ...row, ...patch }` updates what `CrmTasksTable` reads (`task`, `due_date`, `type`, …).
 */
export function mapAclTaskDocToCpTasksListRowPatch(doc) {
  if (!doc || typeof doc !== 'object') return {};

  const patch = {};
  if (doc.name != null) patch.id = doc.name;
  if (doc.subject != null) patch.task = doc.subject;
  if (doc.status != null) patch.status = doc.status;
  if (doc.priority != null) patch.priority = doc.priority;
  if (doc.description != null) patch.description = doc.description;

  if (doc.acl_type != null && String(doc.acl_type).trim() !== '') {
    patch.type = doc.acl_type;
  }

  const exp = doc.exp_end_date;
  if (exp != null && exp !== '') {
    const datePart = typeof exp === 'string' ? exp.trim().split(/[\sT]/)[0] : exp;
    const d = typeof datePart === 'string' ? parseISO(datePart) : new Date(datePart);
    if (isValid(d)) {
      patch.due_date = format(d, 'dd MMM, yyyy');
    }
  }

  return patch;
}
