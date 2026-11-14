import { BLOCK_TYPE_LABELS, type Blocking } from '@/types/reservation';

export function getBlockingReason(blocking: Blocking): string {
  const typeLabel = BLOCK_TYPE_LABELS[blocking.blockType];
  const reason = blocking.reason?.trim();
  return reason ? `${typeLabel}: ${reason}` : typeLabel;
}

