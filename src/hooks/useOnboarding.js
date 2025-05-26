import { useState, useEffect } from 'react';

export const useOnboarding = () => {
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user has seen onboarding
    const onboardingCompleted = localStorage.getItem('onboarding_completed');
    setHasSeenOnboarding(onboardingCompleted === 'true');
    setIsLoading(false);
  }, []);

  const completeOnboarding = () => {
    localStorage.setItem('onboarding_completed', 'true');
    setHasSeenOnboarding(true);
  };

  const resetOnboarding = () => {
    localStorage.removeItem('onboarding_completed');
    setHasSeenOnboarding(false);
  };

  return {
    hasSeenOnboarding,
    isLoading,
    completeOnboarding,
    resetOnboarding
  };
}; 