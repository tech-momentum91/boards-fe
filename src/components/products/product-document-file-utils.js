export function truncateFileName(fileName, maxLength = 30) {
  if (!fileName) return '';
  if (fileName.length <= maxLength) return fileName;
  const extension = fileName.includes('.') ? fileName.slice(fileName.lastIndexOf('.')) : '';
  const base = fileName.slice(0, maxLength - extension.length - 3);
  return `${base}...${extension}`;
}

export function getAcceptForDocumentType(label) {
  if (String(label).toLowerCase().includes('reference image')) {
    return 'image/*';
  }
  return '.pdf,application/pdf';
}

export function getFileUploadHint(label, multiple = false) {
  if (String(label).toLowerCase().includes('reference image')) {
    return multiple ? 'JPG, PNG up to 10 MB each' : 'JPG, PNG up to 10 MB';
  }
  return multiple ? 'PDF up to 10 MB each' : 'PDF up to 10 MB';
}

export function getDocumentGroupKey(document = {}) {
  const docType = String(document.documentType || '').trim();
  const otherType = String(document.otherType || '').trim();
  if (docType.toLowerCase() === 'other' && otherType) {
    return `other:${otherType.toLowerCase()}`;
  }
  return docType.toLowerCase() || 'other';
}

export function groupProductDocumentFiles(files = []) {
  const groups = [];

  files.forEach((file) => {
    const document = file.document || {};
    const groupKey = getDocumentGroupKey(document);
    const groupLabel =
      file.documentTypeLabel || document.documentType || document.otherType || 'Other';

    const existingGroup = groups.find((group) => group.key === groupKey);
    if (existingGroup) {
      existingGroup.files.push(file);
      return;
    }

    groups.push({
      key: groupKey,
      label: groupLabel,
      documentType: document.documentType || '',
      otherType: document.otherType || '',
      files: [file],
    });
  });

  return groups;
}
