/**
 * Build Visitor Entry REST payload. Form field names match `visitor_entry` (and Space CP extension fields).
 * Only `visit_date` + `visit_time` are composed into `visit_date_time`; `inquiry_type` is UI-only and omitted.
 */

export function buildVisitDateTime(visit_date, visit_time) {
  if (!(visit_date instanceof Date) || !visit_time) return null;

  const [timePart, meridian] = visit_time.split(' ');
  const [hoursValue, minutes] = timePart.split(':').map((v) => Number.parseInt(v, 10));
  let hours = hoursValue;

  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;

  if (meridian) {
    const upper = meridian.toUpperCase();
    if (upper === 'PM' && hours !== 12) hours += 12;
    if (upper === 'AM' && hours === 12) hours = 0;
  }

  const dt = new Date(visit_date);
  dt.setHours(hours, minutes, 0, 0);

  const pad = (n) => String(n).padStart(2, '0');
  const yyyy = dt.getFullYear();
  const mm = pad(dt.getMonth() + 1);
  const dd = pad(dt.getDate());
  const hh = pad(dt.getHours());
  const min = pad(dt.getMinutes());

  return `${yyyy}-${mm}-${dd} ${hh}:${min}:00`;
}

function asCheck(v) {
  return v ? 1 : 0;
}

/**
 * @param {object} params
 * @param {string} params.activeTab
 * @param {object} params.formData — react-hook-form values (snake_case; matches Visitor Entry fieldnames)
 */
export function buildInvitePayload({ activeTab, formData, materialCarrying }) {
  const isChannelPartner = formData.inquiry_type === 'channel-partner';
  const { inquiry_type, visit_date, visit_time, ...rest } = formData;
  void inquiry_type;

  const visit_date_time = buildVisitDateTime(visit_date, visit_time);

  const isOtherPurposeSelected = (formData.purpose_of_visit || '').trim().toLowerCase() === 'other';

  const isVisitorTypeInvite = activeTab === 'visitors' || activeTab === 'event-participants';
  const whomToMeet = (formData.whom_to_meet || 'devx').toLowerCase();
  const { whom_to_meet: _whomToMeetUi, ...restWithoutWhom } = rest;

  const base = {
    ...restWithoutWhom,
    visit_date_time,
    ...(isVisitorTypeInvite
      ? {
          meeting_with_host: 1,
          host_company_name:
            whomToMeet === 'client'
              ? (formData.host_company_name || '').trim() || undefined
              : undefined,
        }
      : { meeting_with_host: asCheck(rest.meeting_with_host) }),
    book_meeting_room: asCheck(rest.book_meeting_room),
    other_purpose: isOtherPurposeSelected ? formData.other_purpose || undefined : undefined,
  };

  if (activeTab === 'visitors') {
    return {
      type: 'Visitor',
      ...base,
      first_name: (formData.first_name || '').trim(),
      last_name: (formData.last_name || '').trim(),
    };
  }

  if (activeTab === 'space-inquiries') {
    if (isChannelPartner) {
      const cp_contact_name =
        `${(formData.first_name || '').trim()} ${(formData.last_name || '').trim()}`.trim();
      return {
        type: 'Space',
        space_inquiry_type: 'Channel Partner',
        first_name: (formData.first_name || '').trim(),
        last_name: (formData.last_name || '').trim(),
        mobile_number: (formData.mobile_number || '').trim(),
        email: (formData.email || '').trim(),
        company_name: (formData.cp_company_legal_name || '').trim() || undefined,
        center: formData.center,
        no_of_visitors: formData.no_of_visitors,
        vehicle_number: formData.vehicle_number || undefined,
        badge_number: formData.badge_number || undefined,
        visit_date_time,
        notes: formData.notes || undefined,
        book_meeting_room: asCheck(formData.book_meeting_room),
        client_first_name: (formData.client_first_name || '').trim() || undefined,
        client_last_name: (formData.client_last_name || '').trim() || undefined,
        client_mobile_number: (formData.client_mobile_number || '').trim() || undefined,
        client_email: (formData.client_email || '').trim() || undefined,
        client_company_name: (formData.client_company_name || '').trim() || undefined,
        type_of_space: formData.type_of_space,
        seats: formData.seats,
        sales_person_in_touch: formData.sales_person_in_touch || undefined,
        cp_type: formData.cp_type,
        cp_company_legal_name: (formData.cp_company_legal_name || '').trim() || undefined,
        cp_contact_name,
        cp_contact_mobile: (formData.mobile_number || '').trim(),
        cp_contact_email: (formData.email || '').trim(),
      };
    }

    const source_category = formData.source_category;
    return {
      type: 'Space',
      space_inquiry_type: 'Direct',
      first_name: (formData.first_name || '').trim(),
      last_name: (formData.last_name || '').trim(),
      mobile_number: formData.mobile_number,
      center: formData.center,
      email: formData.email,
      company_name: formData.company_name || undefined,
      no_of_visitors: formData.no_of_visitors,
      vehicle_number: formData.vehicle_number || undefined,
      badge_number: formData.badge_number || undefined,
      visit_date_time,
      notes: formData.notes || undefined,
      book_meeting_room: asCheck(formData.book_meeting_room),
      type_of_space: formData.type_of_space,
      seats: formData.seats,
      source_category: source_category && source_category !== 'Other' ? source_category : undefined,
      other_source:
        source_category === 'Other' ? (formData.other_source || '').trim() || undefined : undefined,
      sales_person_in_touch: formData.sales_person_in_touch || undefined,
    };
  }

  if (activeTab === 'vendors') {
    return {
      type: 'Vendor',
      first_name: (formData.first_name || '').trim(),
      last_name: (formData.last_name || '').trim(),
      vendor: formData.vendor,
      assigned_supervisor: formData.assigned_supervisor,
      material_carrying: materialCarrying === 'yes' ? 1 : 0,
      material_desc: materialCarrying === 'yes' ? formData.material_desc || undefined : undefined,
      ...base,
    };
  }

  return {
    type: 'Visitor',
    first_name: (formData.first_name || '').trim(),
    last_name: (formData.last_name || '').trim(),
    ...base,
  };
}
