export type FeedbackKind = 'success' | 'error' | 'info';

export interface FeedbackDetail {
  kind: FeedbackKind;
  message: string;
}

const feedbackEvent = 'tournamentx:feedback';

export const notify = (kind: FeedbackKind, message: string) => {
  window.dispatchEvent(new CustomEvent<FeedbackDetail>(feedbackEvent, { detail: { kind, message } }));
};

export const feedbackEventName = feedbackEvent;
