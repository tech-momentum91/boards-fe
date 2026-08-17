/**
 * Tab-keyed suggested prompts for AI chat empty state and right panel (Phase 4 / 6).
 * Keep in sync with devx.api.ai_chat_handler.PROMPTS_BY_TAB (first 3 used server-side for off-topic).
 */
export const PROMPTS_BY_TAB = {
  overview: [
    'What needs immediate attention?',
    'How is overall occupancy trending?',
    'Summarize billing health for this center.',
    'What are the top risks this month?',
  ],
  clients: [
    'Which clients are behind on payments?',
    'Who is at churn risk?',
    'What is total outstanding for this center?',
    'Any agreements expiring soon?',
  ],
  facility: [
    'Which floors have the lowest occupancy?',
    'What is the largest OpEx category this period?',
    'Any facility tickets open too long?',
    'How many spaces are vacant over 14 days?',
  ],
  sales: [
    'What is pipeline value for this center?',
    'How many deals are closing this month?',
    'Summarize CRM task backlog.',
    'Win rate and average deal size?',
  ],
  centre_insights: [
    'What unusual patterns show in tickets or occupancy?',
    'What are peak occupancy days?',
    'Top recurring ticket issues?',
    'How does ticket volume compare to last month?',
  ],
  critical_actions: [
    'What must I prioritize this week?',
    'Any overdue maintenance or compliance items?',
    'Biggest collection risks?',
    'Which actions need a ticket created first?',
  ],
  history: [
    'What did we summarize last time?',
    'Compare occupancy to prior period.',
    'Key risks from past summaries?',
    'When was the last executive summary?',
  ],
};
