import {
  buildPublicProposalSharePath,
  buildPublicProposalShareUrl,
  resolvePublicProposalShareUrl,
} from '@/api/crm-proposal-share-url';

describe('crm proposal share URL helpers', () => {
  it('builds path and origin-prefixed share URLs', () => {
    expect(buildPublicProposalSharePath('CRM-PROP-00024', 'abc')).toBe(
      '/public/proposal/CRM-PROP-00024?key=abc',
    );
    expect(buildPublicProposalShareUrl('CRM-PROP-00024', 'abc', 'http://localhost:5173')).toBe(
      'http://localhost:5173/public/proposal/CRM-PROP-00024?key=abc',
    );
  });

  it('prefers token + frontend origin over API-host url', () => {
    const link = {
      proposal: 'CRM-PROP-00024',
      token: 'tok123',
      path: '/public/proposal/CRM-PROP-00024?key=tok123',
      url: 'http://localhost:8081/public/proposal/CRM-PROP-00024?key=tok123',
    };
    expect(resolvePublicProposalShareUrl(link, 'CRM-PROP-00024', 'http://localhost:5173')).toBe(
      'http://localhost:5173/public/proposal/CRM-PROP-00024?key=tok123',
    );
  });
});
