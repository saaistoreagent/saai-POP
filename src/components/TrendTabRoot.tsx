'use client';

import { useState } from 'react';
import LandingView from './trend/LandingView';
import OnboardingView from './trend/OnboardingView';
import PredictionResultView from './trend/PredictionResultView';
import FeedbackView from './trend/FeedbackView';

type TrendView = 'landing' | 'onboarding' | 'result' | 'feedback';

export default function TrendTabRoot() {
  const [view, setView] = useState<TrendView>('landing');
  const [params, setParams] = useState<Record<string, string>>({});

  const navigate = (v: string, p?: Record<string, string>) => {
    setView(v as TrendView);
    setParams(p ?? {});
  };

  switch (view) {
    case 'landing':
      return <LandingView onNavigate={navigate} />;
    case 'onboarding':
      return <OnboardingView onNavigate={navigate} productId={params.productId} />;
    case 'result':
      return <PredictionResultView onNavigate={navigate} productId={params.productId} />;
    case 'feedback':
      return <FeedbackView onNavigate={navigate} productId={params.productId} />;
    default:
      return <LandingView onNavigate={navigate} />;
  }
}
