import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

const Onboarding = ({ onComplete, onSkip }) => {
  const [currentPage, setCurrentPage] = useState(0);
  const navigate = useNavigate();

  const pages = [
    {
      title: "Welcome to ExpenseTracker",
      subtitle: "Your finances, finally in control",
      content: "Track every expense, manage all your wallets, and see exactly where your money goes — all in one place.",
      illustration: "💰",
      features: [
        "Auto-categorized spending",
        "Unlimited wallets",
        "Budget insights in real-time",
        "Clear financial overviews"
      ]
    },
    {
      title: "Manage Multiple Wallets",
      subtitle: "One app for all your accounts",
      content: "Separate your cash, cards, savings, and more. Move funds between wallets instantly — no spreadsheet needed.",
      illustration: "🏦",
      features: [
        "Unlimited wallets",
        "Real-time balances",
        "Easy internal transfers",
        "Custom wallet labels"
      ]
    },
    {
      title: "Set Budgets That Work",
      subtitle: "Know your limits before you hit them",
      content: "Create budgets for your spending categories. Get notified when you're close to the limit and stay in control month after month.",
      illustration: "📊",
      features: [
        "Category-based budgeting",
        "Flexible time periods",
        "Spending alerts",
        "Visual progress tracking"
      ]
    },
    {
      title: "See Where Your Money Goes",
      subtitle: "Make smarter choices with better data",
      content: "View trends and breakdowns through interactive charts. Discover where to cut back and where you’re doing well.",
      illustration: "📈",
      features: [
        "Clear visual insights",
        "Spending by category",
        "Monthly comparisons",
        "Exportable reports"
      ]
    },
    {
      title: "Start Smart. Stay in Control.",
      subtitle: "All set to master your money",
      content: "Create your account now to access your data anywhere — securely, across all devices. Even better, it works offline, so you’re never left guessing, even with no internet.",
      illustration: "🚀",
      features: [
        "Secure cloud sync",
        "Access from any device",
        "Automatic backups",
        "**Works fully offline** – track expenses anytime"
      ]
    }
  ];
  

  const handleNext = () => {
    if (currentPage < pages.length - 1) {
      setCurrentPage(currentPage + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleComplete = () => {
    navigate('/signup');
  };

  const handleSkip = useCallback(() => {
    // Always navigate to signup, regardless of onSkip prop
    navigate('/signup');
    
    // Optional: Still call onSkip if provided (for side effects)
    onSkip?.(); 
  }, [navigate, onSkip]);

  const currentPageData = pages[currentPage];

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center p-2 sm:p-4">
      <div className="w-full max-w-md sm:max-w-2xl md:max-w-4xl mx-auto">
        {/* Skip Button */}
        <div className="flex justify-end mb-2 sm:mb-4">
          <button
            onClick={handleSkip}
            className="text-white/70 hover:text-white transition-colors text-xs sm:text-sm font-medium"
          >
            Skip onboarding →
          </button>
        </div>

        {/* Main Content */}
        <div className="bg-white/10 backdrop-blur-lg rounded-xl sm:rounded-2xl p-4 sm:p-8 md:p-12 shadow-2xl border border-white/20 overflow-y-auto max-h-[80vh]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-12 items-center">
            {/* Left Column - Content */}
            <div className="space-y-4 sm:space-y-6 order-2 md:order-1">
              <div>
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-2 sm:mb-3">
                  {currentPageData.title}
                </h1>
                <p className="text-lg sm:text-xl text-indigo-200 mb-3 sm:mb-6">
                  {currentPageData.subtitle}
                </p>
                <p className="text-white/80 text-base sm:text-lg leading-relaxed">
                  {currentPageData.content}
                </p>
              </div>

              {/* Features List */}
              <div className="space-y-2 sm:space-y-3">
                {currentPageData.features.map((feature, index) => (
                  <div key={index} className="flex items-center space-x-2 sm:space-x-3">
                    <div className="w-2 h-2 bg-indigo-400 rounded-full"></div>
                    <span className="text-white/90 text-sm sm:text-base">{feature}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Column - Illustration Placeholder */}
            <div className="flex justify-center order-1 md:order-2 mb-4 md:mb-0">
              <div className="w-40 h-40 sm:w-60 sm:h-60 md:w-80 md:h-80 bg-white/5 rounded-xl sm:rounded-2xl border-2 border-dashed border-white/30 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-6xl sm:text-8xl mb-2 sm:mb-4">{currentPageData.illustration}</div>
                  <p className="text-white/60 text-xs sm:text-sm">
                    Illustration placeholder
                    <br />
                    {currentPageData.title}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex flex-col sm:flex-row items-center justify-between mt-8 sm:mt-12 space-y-4 sm:space-y-0">
            {/* Page Indicators */}
            <div className="flex space-x-2">
              {pages.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentPage(index)}
                  className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full transition-all duration-300 ${
                    index === currentPage
                      ? 'bg-indigo-400 scale-125'
                      : 'bg-white/30 hover:bg-white/50'
                  }`}
                />
              ))}
            </div>

            {/* Navigation Buttons */}
            <div className="flex space-x-2 sm:space-x-4">
              {currentPage > 0 && (
                <button
                  onClick={handlePrevious}
                  className="px-4 py-2 sm:px-6 sm:py-3 text-white border border-white/30 rounded-lg hover:bg-white/10 transition-colors text-xs sm:text-base"
                >
                  Previous
                </button>
              )}
              <button
                onClick={handleNext}
                className="px-6 py-2 sm:px-8 sm:py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors shadow-lg text-xs sm:text-base"
              >
                {currentPage === pages.length - 1 ? 'Get Started' : 'Next'}
              </button>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-6 sm:mt-8">
            <div className="flex justify-between text-xs sm:text-sm text-white/60 mb-1 sm:mb-2">
              <span>Progress</span>
              <span>{currentPage + 1} of {pages.length}</span>
            </div>
            <div className="w-full bg-white/20 rounded-full h-1.5 sm:h-2">
              <div
                className="bg-gradient-to-r from-indigo-400 to-purple-400 h-1.5 sm:h-2 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${((currentPage + 1) / pages.length) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Bottom Text */}
        <div className="text-center mt-4 sm:mt-6">
          <p className="text-white/60 text-xs sm:text-sm">
            Already have an account?{' '}
            <button
              onClick={() => navigate('/login')}
              className="text-indigo-300 hover:text-indigo-200 font-medium"
            >
              Sign in here
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Onboarding; 