import type { IndustryType } from "@/lib/types";

export type TagTemplate = {
  name: string;
  description: string;
};

export type SegmentTemplate = {
  name: string;
  ruleSummary: string;
};

export type SurveyTemplate = {
  title: string;
  questions: {
    text: string;
    options: string[];
  }[];
};

export type BroadcastTemplate = {
  title: string;
  objective: string;
  exampleMessage: string;
};

export type StepCampaignTemplate = {
  title: string;
  steps: {
    timing: string;
    message: string;
  }[];
};

export type FriendActionPlanTemplate = {
  friendType: string;
  conditionSummary: string;
  recommendedTiming: string;
  objective: string;
  messageTheme: string;
  exampleMessage: string;
  primaryAction: string;
  relatedTags: string[];
};

export type DashboardLabelConfig = {
  industryLabel: string;
  assistMetrics: string[];
  recommendedActions: {
    title: string;
    body: string;
    targetLabel: string;
  }[];
  richMenuExamples: string[];
  contentWords: {
    planInterest: string;
    linkReaction: string;
    inactiveUser: string;
  };
};

export type IndustryLineTemplate = {
  industryType: IndustryType;
  tags: TagTemplate[];
  segments: SegmentTemplate[];
  surveys: SurveyTemplate[];
  broadcastTemplates: BroadcastTemplate[];
  stepCampaignTemplates: StepCampaignTemplate[];
  friendActionPlans: FriendActionPlanTemplate[];
  dashboardLabels: DashboardLabelConfig;
  aiPromptContext: string;
  aiSuggestionExamples: string[];
};
