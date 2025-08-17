import { BorderLabelCandidate } from './border-label-candidate';

export interface BorderLabelsResult {
  candidatesByFaction: Record<string, Array<BorderLabelCandidate>>;
}
