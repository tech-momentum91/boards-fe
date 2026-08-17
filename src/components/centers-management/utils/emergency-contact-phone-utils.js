export function isMobileStdCode(value) {
  return String(value || '').replaceAll(/\D/g, '') === '91';
}

export function displayStdCode(option) {
  if (!option) return '';
  return isMobileStdCode(option.std_code) ? '+91' : option.std_code;
}

export function formatContactNumber(stdCode, localNumber) {
  const std = String(stdCode || '').replaceAll(/\D/g, '');
  const local = String(localNumber || '').replaceAll(/\D/g, '');
  if (!local) return '';
  if (!std) return local;
  if (std === '91') return `+91-${local}`;
  return `0${std}-${local}`;
}

export function parseContactNumber(contactNumber) {
  const raw = String(contactNumber || '').trim();
  if (!raw) return { stdCode: '', localNumber: '' };
  if (raw.includes('-')) {
    const [left, right] = raw.split('-');
    const leftDigits = String(left || '').replaceAll(/\D/g, '');
    const stdCode = leftDigits === '91' ? '91' : leftDigits.replace(/^0/, '');
    const localNumber = String(right || '').replaceAll(/\D/g, '');
    return { stdCode, localNumber };
  }
  const digits = raw.replaceAll(/\D/g, '');
  if (digits.length >= 12 && digits.startsWith('91')) {
    return { stdCode: '91', localNumber: digits.slice(-10) };
  }
  return { stdCode: '', localNumber: digits };
}

export function stdOptionAreaText(option) {
  const joined = [option.sdca_name, option.ldca_name].filter(Boolean).join(' · ').trim();
  if (joined) return joined;
  const label = String(option.label || '');
  const idx = label.indexOf('—');
  if (idx >= 0) return label.slice(idx + 1).trim();
  return label;
}

export function withSavedStdOption(options, stdCode) {
  if (!stdCode || options.some((o) => o.std_code === stdCode)) return options;
  return [
    {
      optionKey: `__saved__${stdCode}`,
      std_code: stdCode,
      label: `${stdCode} — (saved on contact)`,
      sdca_name: '',
      ldca_name: '',
      state_code: '',
    },
    ...options,
  ];
}
