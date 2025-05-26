import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const OnboardingEnhanced = ({ onComplete, onSkip }) => {
  const [currentPage, setCurrentPage] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const navigate = useNavigate();

  const pages = [
    {
      title: "Welcome to ExpenseTracker",
      subtitle: "Take control of your finances with smart expense tracking",
      content: "Track your expenses, manage multiple wallets, and gain insights into your spending habits with our comprehensive financial management tool.",
      illustration: "💰",
      color: "from-blue-600 to-indigo-600",
      features: [
        "Smart expense categorization",
        "Multiple wallet management", 
        "Real-time budget tracking",
        "Detailed financial insights"
      ]
    },
    {
      title: "Multiple Wallets",
      subtitle: "Organize your finances across different accounts",
      content: "Create and manage multiple wallets for different purposes - checking account, savings, cash, credit cards, and more. Transfer money between wallets seamlessly.",
      illustration: "🏦",
      color: "from-green-600 to-emerald-600",
      features: [
        "Unlimited wallet creation",
        "Real-time balance tracking",
        "Easy wallet-to-wallet transfers",
        "Custom wallet categories"
      ]
    },
    {
      title: "Smart Budgeting",
      subtitle: "Set budgets and stay on track with your financial goals",
      content: "Create budgets for different categories and time periods. Get notifications when you're approaching your limits and track your progress in real-time.",
      illustration: "📊",
      color: "from-purple-600 to-violet-600",
      features: [
        "Category-based budgets",
        "Monthly & custom periods",
        "Progress notifications",
        "Visual budget tracking"
      ]
    },
    {
      title: "Expense Analytics",
      subtitle: "Understand your spending patterns with detailed insights",
      content: "Visualize your expenses with interactive charts and reports. Identify trends, track categories, and make informed financial decisions.",
      illustration: "📈",
      color: "from-orange-600 to-red-600",
      features: [
        "Interactive charts & graphs",
        "Category breakdown analysis",
        "Monthly spending trends",
        "Export financial reports"
      ]
    },
    {
      title: "Ready to Start?",
      subtitle: "Begin your journey to better financial management",
      content: "You're all set! Create your account to start tracking expenses, managing wallets, and taking control of your financial future.",
      illustration: "🚀",
      color: "from-pink-600 to-rose-600",
      features: [
        "Secure cloud sync",
        "Cross-device access",
        "Data backup & recovery",
        "Privacy-first approach"
      ]
    }
  ];

  const handleNext = () => {
    if (isAnimating) return;
    
    setIsAnimating(true);
    setTimeout(() => {
      if (currentPage < pages.length - 1) {
        setCurrentPage(currentPage + 1);
      } else {
        handleComplete();
      }
      setIsAnimating(false);
    }, 150);
  };

  const handlePrevious = () => {
    if (isAnimating) return;
    
    setIsAnimating(true);
    setTimeout(() => {
      if (currentPage > 0) {
        setCurrentPage(currentPage - 1);
      }
      setIsAnimating(false);
    }, 150);
  };

  const handleComplete = () => {
    if (onComplete) {
      onComplete();
    } else {
      navigate('/signup');
    }
  };

  const handleSkip = () => {
    if (onSkip) {
      onSkip();
    } else {
      navigate('/signup');
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrevious();
      } else if (e.key === 'Escape') {
        handleSkip();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentPage, isAnimating]);

  const currentPageData = pages[currentPage];

  return (
    <div className={`min-h-screen bg-gradient-to-br ${currentPageData.color} transition-all duration-700 flex items-center justify-center p-4`}>
      <div className="max-w-6xl w-full">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div className="text-white/80 text-sm">
            ExpenseTracker
          </div>
          <button
            onClick={handleSkip}
            className="text-white/70 hover:text-white transition-colors text-sm font-medium px-4 py-2 rounded-lg hover:bg-white/10"
          >
            Skip onboarding →
          </button>
        </div>

        {/* Main Content */}
        <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-6 md:p-12 shadow-2xl border border-white/20">
          <div className={`grid lg:grid-cols-2 gap-8 lg:gap-16 items-center transition-all duration-500 ${isAnimating ? 'opacity-50 scale-95' : 'opacity-100 scale-100'}`}>
            
            {/* Left Column - Content */}
            <div className="space-y-8 order-2 lg:order-1">
              <div>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 leading-tight">
                  {currentPageData.title}
                </h1>
                <p className="text-xl md:text-2xl text-white/80 mb-6 leading-relaxed">
                  {currentPageData.subtitle}
                </p>
                <p className="text-white/70 text-lg leading-relaxed">
                  {currentPageData.content}
                </p>
              </div>

              {/* Features List */}
              <div className="space-y-4">
                {currentPageData.features.map((feature, index) => (
                  <div 
                    key={index} 
                    className="flex items-center space-x-4 transform transition-all duration-300 hover:translate-x-2"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className="w-3 h-3 bg-white/60 rounded-full flex-shrink-0"></div>
                    <span className="text-white/90 text-lg">{feature}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Column - Illustration Placeholder */}
            <div className="flex justify-center order-1 lg:order-2">
              <div className="w-full max-w-md aspect-square bg-white/5 rounded-3xl border-2 border-dashed border-white/30 flex items-center justify-center hover:bg-white/10 transition-all duration-300 hover:scale-105">
                <div className="text-center p-8">
                  <div className="text-8xl md:text-9xl mb-6 animate-bounce">
                    {currentPageData.illustration}
                  </div>
                  <p className="text-white/60 text-sm md:text-base">
                    Illustration placeholder
                    <br />
                    <span className="font-medium">{currentPageData.title}</span>
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex flex-col sm:flex-row items-center justify-between mt-12 space-y-6 sm:space-y-0">
            {/* Page Indicators */}
            <div className="flex space-x-3">
              {pages.map((_, index) => (
                <button
                  key={index}
                  onClick={() => !isAnimating && setCurrentPage(index)}
                  className={`w-4 h-4 rounded-full transition-all duration-300 ${
                    index === currentPage
                      ? 'bg-white scale-125 shadow-lg'
                      : 'bg-white/30 hover:bg-white/50 hover:scale-110'
                  }`}
                  disabled={isAnimating}
                />
              ))}
            </div>

            {/* Navigation Buttons */}
            <div className="flex space-x-4">
              {currentPage > 0 && (
                <button
                  onClick={handlePrevious}
                  disabled={isAnimating}
                  className="px-6 py-3 text-white border border-white/30 rounded-xl hover:bg-white/10 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
              )}
              
              <button
                onClick={handleNext}
                disabled={isAnimating}
                className="px-8 py-3 bg-white/20 hover:bg-white/30 text-white rounded-xl font-medium transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed backdrop-blur-sm"
              >
                {currentPage === pages.length - 1 ? 'Get Started' : 'Next'}
              </button>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-8">
            <div className="flex justify-between text-sm text-white/60 mb-3">
              <span>Progress</span>
              <span>{currentPage + 1} of {pages.length}</span>
            </div>
            <div className="w-full bg-white/20 rounded-full h-3 overflow-hidden">
              <div
                className="bg-gradient-to-r from-white/60 to-white/80 h-3 rounded-full transition-all duration-700 ease-out shadow-sm"
                style={{ width: `${((currentPage + 1) / pages.length) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Bottom Text */}
        <div className="text-center mt-8">
          <p className="text-white/60 text-sm md:text-base">
            Already have an account?{' '}
            <button
              onClick={() => navigate('/login')}
              className="text-white font-medium hover:text-white/80 underline underline-offset-2"
            >
              Sign in here
            </button>
          </p>
          <p className="text-white/40 text-xs mt-2">
            Use arrow keys to navigate • Press ESC to skip
          </p>
        </div>
      </div>
    </div>
  );
};

export default OnboardingEnhanced;