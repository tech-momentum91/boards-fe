export const COMPANY_IDENTITY_FIELDS = [
  { key: 'Company_Identity.Legal_Name', label: 'Legal Name' },
  { key: 'Company_Identity.Brand_Names', label: 'Brand Name(s)' },
  { key: 'Company_Identity.Primary_Domain', label: 'Primary Domain' },
  // { key: 'Company_Identity.Secondary_Domains', label: 'Secondary Domains' },
  { key: 'Company_Identity.Logo', label: 'Logo' },
  // { key: 'Company_Identity.Tagline', label: 'Tagline' },
  {
    key: 'Company_Identity.Short_Description',
    label: 'Short Description',
    multiline: true,
    fullWidth: false,
  },
  {
    key: 'Company_Identity.Long_Description',
    label: 'Long Description',
    multiline: true,
    fullWidth: false,
  },
  // { key: 'Company_Identity.Industry_L1', label: 'Industry (L1)' },
  // { key: 'Company_Identity.Sub_Industry_L2_L3', label: 'Sub-Industry (L2/L3)' },
  // { key: 'Company_Identity.NAICS_SIC_Code', label: 'NAICS / SIC Code' },
  // { key: 'Company_Identity.Business_Model', label: 'Business Model' },
  // { key: 'Company_Identity.Company_Stage', label: 'Company Stage' },
  // { key: 'Company_Identity.Ownership_Type', label: 'Ownership Type' },
  { key: 'Company_Identity.Founded_Year', label: 'Founded Year' },
  // { key: 'Company_Identity.Previous_Names', label: 'Previous Names' },
  // { key: 'Company_Identity.Parent_Company', label: 'Parent Company' },
  // { key: 'Company_Identity.Subsidiaries', label: 'Subsidiaries' },
  // { key: 'Company_Identity.Sister_Companies', label: 'Sister Companies' },
];

export const LOCATION_FIELDS = [
  {
    key: 'Location_Presence.HQ_Full_Address',
    label: 'HQ Full Address',
    multiline: true,
    fullWidth: false,
  },
  { key: 'Location_Presence.HQ_City_State_Country', label: 'HQ City / State / Country' },
  { key: 'Location_Presence.HQ_Geo_coordinates', label: 'HQ Geo-coordinates' },
  // { key: 'Location_Presence.All_Office_Cities_List', label: 'All Office Cities' },
  // { key: 'Location_Presence.Office_Count_Total', label: 'Office Count (Total)' },
  {
    key: 'Location_Presence.Countries_Present_List',
    label: 'Countries Present',
    hideWhenNull: true,
  },
  {
    key: 'Location_Presence.Service_Areas_Markets',
    label: 'Service Areas / Markets',
    hideWhenNull: true,
  },
  { key: 'Location_Presence.Incorporation_Country', label: 'Incorporation Country' },
  { key: 'Location_Presence.cities_present_list', label: 'Cities Present' },
  // { key: 'Location_Presence.CIN_Registration_No', label: 'CIN / Registration No.' },
  // { key: 'Location_Presence.GST_Number', label: 'GST Number' },
  // { key: 'Location_Presence.PAN', label: 'PAN' },
  // { key: 'Location_Presence.Legal_Entity_Type', label: 'Legal Entity Type' },
];

export const ORG_HEADCOUNT_FIELDS = [
  { key: 'Org_Headcount.Total_Headcount', label: 'Total Headcount' },
  { key: 'Org_Headcount.Headcount_Range_Bucket', label: 'Headcount Range Bucket' },
  { key: 'Org_Headcount.Engineering_HC', label: 'Engineering HC', hideWhenNull: true },
  { key: 'Org_Headcount.Sales_HC', label: 'Sales HC', hideWhenNull: true },
  { key: 'Org_Headcount.Marketing_HC', label: 'Marketing HC', hideWhenNull: true },
  { key: 'Org_Headcount.Operations_HC', label: 'Operations HC', hideWhenNull: true },
  { key: 'Org_Headcount.Finance_HC', label: 'Finance HC', hideWhenNull: true },
  { key: 'Org_Headcount.CXO_List', label: 'CXO', multiline: true, fullWidth: false },
  {
    key: 'Org_Headcount.Founders_List',
    label: 'Founders (Names)',
    multiline: true,
    fullWidth: false,
  },
  {
    key: 'Org_Headcount.Board_of_Directors_List',
    label: 'Board of Directors',
    multiline: true,
    fullWidth: false,
  },
  // { key: 'Org_Headcount.Advisors_List', label: 'Advisors' },
];

export const CLASSIFICATION_STRUCTURE_FIELDS = [
  { key: 'Company_Identity.Industry_L1', label: 'Industry' },
  { key: 'Company_Identity.Sub_Industry_L2_L3', label: 'Sub-Industry (L2/L3)' },
  { key: 'Company_Identity.Business_Model', label: 'Business Model' },
  { key: 'Company_Identity.Company_Stage', label: 'Company Stage', hideWhenNull: true },
  { key: 'Company_Identity.Ownership_Type', label: 'Ownership Type' },
  { key: 'Company_Identity.Subsidiaries', label: 'Subsidiaries', hideWhenNull: true },
  { key: 'Company_Identity.Parent_Company', label: 'Parent Company', hideWhenNull: true },
];

export const HISTORICAL_HEADCOUNT_FIELDS = [
  { key: 'Historical_Headcount.Headcount_by_Year', label: 'Headcount by Year' },
  { key: 'Historical_Headcount.Dept_HC_by_Year', label: 'Dept HC by Year' },
  { key: 'Historical_Headcount.YoY_HC_Growth_Percent', label: 'YoY HC Growth %' },
  { key: 'Historical_Headcount.Hiring_Velocity', label: 'Hiring Velocity' },
  { key: 'Historical_Headcount.Layoff_Events', label: 'Layoff Events' },
  { key: 'Historical_Headcount.Hiring_Freeze_Signals', label: 'Hiring Freeze Signals' },
  { key: 'Historical_Headcount.Dept_Expansion_Trend', label: 'Dept Expansion Trend' },
];

export const PRODUCT_OFFERING_FIELDS = [
  { key: 'Product_Offerings.Product_Service_Names', label: 'Product / Service Names' },
  { key: 'Product_Offerings.Product_Categories', label: 'Product Categories' },
  { key: 'Product_Offerings.Product_Launch_Dates', label: 'Product Launch Dates' },
  { key: 'Product_Offerings.Product_Lifecycle_Stage', label: 'Product Lifecycle Stage' },
  { key: 'Product_Offerings.Pricing_Model', label: 'Pricing Model' },
  { key: 'Product_Offerings.Pricing_Tiers', label: 'Pricing Tiers' },
  { key: 'Product_Offerings.Target_Customer_Segments', label: 'Target Customer Segments' },
  { key: 'Product_Offerings.Key_Use_Cases', label: 'Key Use Cases' },
];
