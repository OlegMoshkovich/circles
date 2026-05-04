import React from "react";

export type OnboardingRestartOptions = {
  /** Remove `terms_acceptances` so you can go through the Terms step again (e.g. testing). */
  clearTermsAcceptance?: boolean;
};

export const OnboardingRestartContext = React.createContext<{
  restart: (options?: OnboardingRestartOptions) => void | Promise<void>;
}>({ restart: () => {} });
