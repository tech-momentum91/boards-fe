export const PRODUCT_SERVICES_FIELDS = [
  {
    key: 'Product_Offerings.Product_Service_Names',
    label: 'Product / Service Names',
    multiline: true,
    fullWidth: false,
  },
  {
    key: 'Product_Offerings.Product_Categories',
    label: 'Product Categories',
    multiline: true,
    fullWidth: false,
  },
  { key: 'Product_Offerings.Pricing_Model', label: 'Pricing Model' },
  { key: 'Product_Offerings.Pricing_Tiers', label: 'Pricing Tiers', hideWhenNull: true },
  {
    key: 'Product_Offerings.Target_Customer_Segments',
    label: 'Target Customer Segments',
    hideWhenNull: true,
    multiline: true,
    fullWidth: false,
  },
];

export const MARKET_COMPETITIVE_FIELDS = [
  {
    key: 'Market_Competitive.Direct_Competitors',
    label: 'Direct Competitors',
    multiline: true,
    fullWidth: false,
  },
  {
    key: 'Market_Competitive.Indirect_Competitors',
    label: 'Indirect Competitors',
    multiline: true,
    fullWidth: false,
  },
  { key: 'Market_Competitive.Market_Category', label: 'Market Category' },
  { key: 'Market_Competitive.Market_Tier', label: 'Market Tier' },
  {
    key: 'Market_Competitive.Key_Differentiators',
    label: 'Key Differentiators',
    hideWhenNull: true,
    multiline: true,
    fullWidth: false,
  },
  { key: 'Market_Competitive.Market_Share_Percent', label: 'Market Share (%)', hideWhenNull: true },
];

export const GROWTH_TRACTION_FIELDS = [
  { key: 'Growth_Traction.Monthly_Web_Visits', label: 'Monthly Web Visits' },
  { key: 'Growth_Traction.Traffic_Trend_12_24_mo', label: 'Traffic Trend (12–24 mo)' },
  { key: 'Growth_Traction.Traffic_Source_Mix', label: 'Traffic Source Mix' },
  { key: 'Growth_Traction.Domain_Authority_Score', label: 'Domain Authority Score' },
  { key: 'Growth_Traction.Total_Backlinks', label: 'Total Backlinks' },
  { key: 'Growth_Traction.Keywords_Ranked', label: 'Keywords Ranked' },
  { key: 'Growth_Traction.Customer_Count_Approx', label: 'Customer Count (Approx.)' },
  { key: 'Growth_Traction.Notable_Customer_Logos', label: 'Notable Customer Logos' },
];

export const DIGITAL_PRESENCE_FIELDS = [
  { key: 'Digital_Presence.Website_URL', label: 'Website URL' },
  { key: 'Digital_Presence.LinkedIn_Company_Page_URL', label: 'LinkedIn Company Page URL' },
  { key: 'Digital_Presence.Twitter_X_Handle', label: 'Twitter / X Handle' },
  { key: 'Digital_Presence.Facebook_Page', label: 'Facebook Page' },
  { key: 'Digital_Presence.Instagram_Handle', label: 'Instagram Handle' },
  { key: 'Digital_Presence.YouTube_Channel', label: 'YouTube Channel' },
  { key: 'Digital_Presence.Blog_Medium_Substack', label: 'Blog / Medium / Substack' },
  { key: 'Digital_Presence.LinkedIn_Followers', label: 'LinkedIn Followers' },
  { key: 'Digital_Presence.Twitter_X_Followers', label: 'Twitter / X Followers' },
];

export const INTENT_BEHAVIOR_FIELDS = [
  {
    key: 'Intent_Behavior.Buying_Intent_Keywords',
    label: 'Buying Intent Keywords',
    multiline: true,
    fullWidth: false,
  },
  {
    key: 'Intent_Behavior.Content_Engagement_Signals',
    label: 'Content Engagement Signals',
    multiline: true,
    fullWidth: false,
  },
  { key: 'Intent_Behavior.Website_Visit_Intent', label: 'Website Visit Intent' },
  {
    key: 'Intent_Behavior.Tech_Adoption_Signals',
    label: 'Tech Adoption Signals',
    multiline: true,
    fullWidth: false,
  },
  { key: 'Intent_Behavior.Open_Job_Roles', label: 'Open Job Roles' },
  { key: 'Intent_Behavior.Hiring_Department_Focus', label: 'Hiring Department Focus' },
];
