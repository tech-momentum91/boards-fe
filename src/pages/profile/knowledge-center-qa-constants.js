import {
  RiBuildingLine,
  RiCalendarTodoLine,
  RiCommunityLine,
  RiEyeLine,
  RiGiftLine,
  RiGlobalLine,
  RiLightbulbLine,
  RiLoopRightLine,
  RiMapPinLine,
  RiMegaphoneLine,
  RiQuestionAnswerLine,
  RiQuestionLine,
  RiTrophyLine,
  RiUserStarLine,
} from 'react-icons/ri';

/** Category tabs for Knowledge Center Q&A (matches sidebar labels / filters). */
export const QA_CATEGORY_ITEMS = [
  { value: 'all', label: 'All', icon: RiQuestionAnswerLine },
  { value: 'Founder Story', label: 'Founder Story', icon: RiUserStarLine },
  { value: 'Philosophy', label: 'Philosophy', icon: RiLightbulbLine },
  { value: 'Sales Approach', label: 'Sales Approach', icon: RiMegaphoneLine },
  { value: 'Offerings', label: 'Offerings', icon: RiGiftLine },
  { value: 'Industry & GCC', label: 'Industry & GCC', icon: RiGlobalLine },
  { value: 'Landlord', label: 'Landlord', icon: RiBuildingLine },
  { value: 'Client FAQs', label: 'Client FAQs', icon: RiQuestionLine },
  { value: 'Client Revolutions', label: 'Client Revolutions', icon: RiLoopRightLine },
  { value: 'Success Stories', label: 'Success Stories', icon: RiTrophyLine },
  { value: 'City Intel', label: 'City Intel', icon: RiMapPinLine },
  { value: 'Center Intel', label: 'Center Intel', icon: RiCommunityLine },
  { value: 'Upcoming Inventory', label: 'Upcoming Inventory', icon: RiCalendarTodoLine },
  { value: 'Founder POV', label: 'Founder POV', icon: RiEyeLine },
];

export const qaCategoryLabelByValue = QA_CATEGORY_ITEMS.reduce((acc, item) => {
  acc[item.value] = item.label;
  return acc;
}, /** @type {Record<string, string>} */ ({}));
