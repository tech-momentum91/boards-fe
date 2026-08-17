export const DIGITAL_PRESENCE_FIELDS = [
  { key: 'Digital_Presence.Website_URL', label: 'Website URL' },
  { key: 'Digital_Presence.LinkedIn_Company_Page_URL', label: 'LinkedIn Company Page URL' },
  { key: 'Digital_Presence.Twitter_X_Handle', label: 'Twitter / X Handle' },
  { key: 'Digital_Presence.Facebook_Page', label: 'Facebook Page' },
  { key: 'Digital_Presence.Instagram_Handle', label: 'Instagram Handle' },
  { key: 'Digital_Presence.YouTube_Channel', label: 'YouTube Channel' },
  { key: 'Digital_Presence.Blog_Medium_Substack', label: 'Blog / Medium / Substack' },
  { key: 'Digital_Presence.LinkedIn_Followers', label: 'LinkedIn Followers' },
  // { key: 'Digital_Presence.Twitter_X_Followers', label: 'Twitter / X Followers' },
];

export const NEWS_SIGNALS_FIELDS = [
  // { key: 'News_Signals.News_Articles', label: 'News Articles' },
  {
    key: 'News_Signals.Recent_News_Mentions',
    label: 'Recent News Mentions',
    multiline: true,
    fullWidth: false,
  },
  {
    key: 'News_Signals.Press_Releases',
    label: 'Press Releases',
    multiline: true,
    fullWidth: false,
  },
  { key: 'News_Signals.M_A_Activity', label: 'M&A Activity' },
  { key: 'News_Signals.Product_Launch_Events', label: 'Product Launch Events' },
  { key: 'News_Signals.Leadership_Change_Events', label: 'Leadership Change Events' },
  {
    key: 'News_Signals.Awards_Recognition',
    label: 'Awards & Recognition',
    multiline: true,
    fullWidth: false,
  },
  { key: 'News_Signals.Regulatory_Legal_Events', label: 'Regulatory / Legal Events' },
];

export const COMPLIANCE_LEGAL_FIELDS = [
  { key: 'Compliance_Legal.CIN_Number', label: 'CIN Number (consolidated)' },
  { key: 'Compliance_Legal.GST_Registration', label: 'GST Registration (consolidated)' },
  { key: 'Compliance_Legal.PAN', label: 'PAN (consolidated)' },
  { key: 'Compliance_Legal.Legal_Entity_Type', label: 'Legal Entity Type' },
  { key: 'Compliance_Legal.ROC_Filing_Status', label: 'ROC Filing Status' },
  // { key: 'Compliance_Legal.Director_DIN_List', label: 'Director DIN List' },
  {
    key: 'Compliance_Legal.ISO_Certifications',
    label: 'ISO Certifications',
    multiline: true,
    fullWidth: false,
  },
  // { key: 'Compliance_Legal.SEC_EDGAR_Filings', label: 'SEC / EDGAR Filings' },
];
