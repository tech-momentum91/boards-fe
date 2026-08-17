export const FUNDING_INVESTMENT_FIELDS = [
  { key: 'Funding_Investment.Funding_Rounds_List', label: 'Funding Rounds (List)' },
  { key: 'Funding_Investment.Round_Type', label: 'Round Type', hideWhenNull: true },
  { key: 'Funding_Investment.Amount_per_Round', label: 'Amount per Round', hideWhenNull: true },
  { key: 'Funding_Investment.Round_Date', label: 'Round Date', hideWhenNull: true },
  { key: 'Funding_Investment.Total_Funding_Raised', label: 'Total Funding Raised' },
  { key: 'Funding_Investment.Last_Round_Date', label: 'Last Round Date', hideWhenNull: true },
  {
    key: 'Funding_Investment.Time_Between_Rounds',
    label: 'Time Between Rounds',
    hideWhenNull: true,
  },
  {
    key: 'Funding_Investment.Valuation_at_Last_Round',
    label: 'Valuation at Last Round',
    hideWhenNull: true,
  },
  // { key: 'Funding_Investment.Investor_List', label: 'Investor List' },
  // { key: 'Funding_Investment.Lead_Investors', label: 'Lead Investors' },
  // { key: 'Funding_Investment.Investor_Type', label: 'Investor Type' },
  { key: 'Funding_Investment.Exit_IPO_Status', label: 'Exit / IPO Status', hideWhenNull: true },
];

export const FINANCIAL_DATA_FIELDS = [
  { key: 'Financial_Data.Revenue_Current', label: 'Revenue (Current)' },
  { key: 'Financial_Data.Revenue_Range_Bucket', label: 'Revenue Range Bucket' },
  { key: 'Financial_Data.EBITDA_Net_Profit', label: 'EBITDA / Net Profit' },
  { key: 'Financial_Data.Gross_Margin_Percent', label: 'Gross Margin %' },
  { key: 'Financial_Data.Burn_Rate_Estimate', label: 'Burn Rate (Estimate)', hideWhenNull: true },
  {
    key: 'Financial_Data.Revenue_by_Year',
    label: 'Revenue by Year',
    multiline: true,
    fullWidth: false,
  },
  {
    key: 'Financial_Data.Profit_Loss_by_Year',
    label: 'Profit/Loss by Year',
    multiline: true,
    fullWidth: false,
  },
  { key: 'Financial_Data.YoY_Revenue_Growth_Percent', label: 'YoY Revenue Growth %' },
  {
    key: 'Financial_Data.Revenue_CAGR_3yr_5yr',
    label: 'Revenue CAGR (3yr / 5yr)',
    hideWhenNull: true,
  },
  { key: 'Financial_Data.Revenue_per_Employee', label: 'Revenue per Employee', hideWhenNull: true },
];

export const INVESTMENT_HISTORY_FIELDS = [
  { key: 'Funding_Investment.Investor_List', label: 'Investor List', hideWhenNull: true },
  { key: 'Funding_Investment.Investor_Type', label: 'Investor Type', hideWhenNull: true },
];
