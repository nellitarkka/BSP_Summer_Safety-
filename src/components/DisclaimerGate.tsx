import type { ReactNode } from 'react';

interface DisclaimerGateProps {
  accepted: boolean;
  onRequireAcceptance: () => void;
  children: ReactNode;
}

// Gates emergency-related features behind disclaimer acceptance (FR-07).
// Phase 1 (FEAT-001) wires `accepted` from the user's profile and routes
// `onRequireAcceptance` to the onboarding disclaimer screen.
export function DisclaimerGate({ accepted, onRequireAcceptance, children }: DisclaimerGateProps) {
  if (!accepted) {
    onRequireAcceptance();
    return null;
  }
  return <>{children}</>;
}
