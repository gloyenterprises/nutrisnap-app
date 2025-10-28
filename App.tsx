


import React, { useState, useEffect, useMemo } from 'react';
import { Dashboard } from './components/Dashboard';
import { RecipeFinder } from './components/RecipeFinder';
import { CommunityFeed } from './components/CommunityFeed';
import { Home } from './components/Home';
import { SignUp } from './components/SignUp';
import { Profile } from './components/Profile';
import { Onboarding } from './components/Onboarding';
import { Progress } from './components/Progress';
import { Camera, UtensilsCrossed, Users, Grape, Home as HomeIcon, User as UserIcon, TrendingUp } from 'lucide-react';
import { Header } from './components/Header';
import { AiChat } from './components/AiChat';
import type { UserProfile } from './types';

type View = 'home' | 'dashboard' | 'recipes' | 'community' | 'profile' | 'progress';

type Theme = 'light' | 'dark';
export const ThemeContext = React.createContext<{ theme: Theme; toggleTheme: () => void } | null>(null);

const App: React.FC = () => {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isOnboardingComplete, setIsOnboardingComplete] = useState<boolean>(false);
  const [activeView, setActiveView] = useState<View>('home');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem('nutrisnap_theme') as Theme) || 'light');

  useEffect(() => {
    // Load user data robustly, preventing data loss on updates
    try {
      const savedProfileJSON = localStorage.getItem('nutrisnap_userProfile');
      if (savedProfileJSON) {
        const savedProfile = JSON.parse(savedProfileJSON);

        // Check if the loaded profile is a valid object, but don't be too strict.
        // This prevents data wipes if the data structure changes in an update.
        if (savedProfile && typeof savedProfile === 'object') {
          // Create a default profile structure to merge with,
          // ensuring the app always has the fields it needs.
          const defaultProfile: Partial<UserProfile> = {
            name: 'User',
            email: '',
            avatarUrl: '',
          };

          const migratedProfile: UserProfile = { ...defaultProfile, ...savedProfile };

          // We'll only set the profile if essential data exists after merging.
          if (migratedProfile.name && migratedProfile.email && migratedProfile.avatarUrl) {
            setUserProfile(migratedProfile);
            const onboardingStatus = localStorage.getItem('nutrisnap_onboardingComplete');
            setIsOnboardingComplete(onboardingStatus === 'true');
          } else {
            // This case would be rare, meaning the stored object was empty or malformed
            // but still valid JSON. We should clear it to allow the user to sign up again.
            console.warn('User profile in localStorage is missing essential fields. Clearing for re-signup.');
            localStorage.removeItem('nutrisnap_userProfile');
            localStorage.removeItem('nutrisnap_onboardingComplete');
          }
        } else {
          // The stored item was not a valid object (e.g., just a string or number)
          console.warn('Invalid user profile structure in localStorage. Clearing.');
          localStorage.removeItem('nutrisnap_userProfile');
          localStorage.removeItem('nutrisnap_onboardingComplete');
        }
      }
    } catch (error) {
      console.error("Failed to parse user profile from localStorage. Clearing corrupted data.", error);
      // If JSON parsing fails, the data is truly corrupted and must be removed.
      localStorage.removeItem('nutrisnap_userProfile');
      localStorage.removeItem('nutrisnap_onboardingComplete');
    }
  }, []); // Empty dependency array ensures this runs only once on mount

  useEffect(() => {
    // Apply theme class to root element whenever theme changes
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('nutrisnap_theme', newTheme);
  };
  
  const themeValue = useMemo(() => ({ theme, toggleTheme }), [theme]);

  const updateProfile = (profile: UserProfile) => {
    localStorage.setItem('nutrisnap_userProfile', JSON.stringify(profile));
    setUserProfile(profile);
  };
  
  const handleOnboardingComplete = (profile: UserProfile) => {
    updateProfile(profile);
    localStorage.setItem('nutrisnap_onboardingComplete', 'true');
    setIsOnboardingComplete(true);
    setActiveView('dashboard');
  };

  const renderView = () => {
    switch (activeView) {
      case 'home':
        return <Home setActiveView={setActiveView} />;
      case 'dashboard':
        return <Dashboard />;
      case 'recipes':
        return <RecipeFinder />;
      case 'community':
        return <CommunityFeed userProfile={userProfile} />;
      case 'profile':
        return <Profile userProfile={userProfile!} onUpdateProfile={updateProfile} />;
      case 'progress':
        return <Progress userProfile={userProfile!} />;
      default:
        return <Home setActiveView={setActiveView} />;
    }
  };

  if (!userProfile) {
    return <SignUp onSignUp={updateProfile} />;
  }
  
  if (!isOnboardingComplete) {
      return <Onboarding userProfile={userProfile} onComplete={handleOnboardingComplete} />;
  }

  const navItems = [
    { id: 'home', icon: <HomeIcon size={24} />, label: 'Home' },
    { id: 'dashboard', icon: <Camera size={24} />, label: 'Snap' },
    { id: 'progress', icon: <TrendingUp size={24} />, label: 'Progress' },
    { id: 'recipes', icon: <UtensilsCrossed size={24} />, label: 'Recipes' },
    { id: 'community', icon: <Users size={24} />, label: 'Community' },
  ];
  
  const desktopNavItems = [
    { id: 'dashboard', icon: <Camera size={24} />, label: 'Snap' },
    { id: 'progress', icon: <TrendingUp size={24} />, label: 'Progress' },
    { id: 'recipes', icon: <UtensilsCrossed size={24} />, label: 'Recipes' },
    { id: 'community', icon: <Users size={24} />, label: 'Community' },
    { id: 'profile', icon: <UserIcon size={24} />, label: 'Profile' },
  ];

  return (
    <ThemeContext.Provider value={themeValue}>
      <div className="h-screen font-sans bg-teal-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200">
        
        {/* Desktop Sidebar Navigation */}
        <aside className="hidden md:flex fixed top-0 left-0 h-screen w-20 bg-white dark:bg-gray-800 border-r border-teal-200 dark:border-gray-700 flex-col items-center py-8 shadow-md z-20">
          <button onClick={() => setActiveView('home')} className="text-teal-500 mb-12 hover:animate-pulse">
             <Grape size={32} />
          </button>
          <div className="flex flex-col space-y-8">
            {desktopNavItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id as View)}
                title={item.label}
                className={`flex flex-col items-center justify-center transition-colors duration-200 group ${
                  activeView === item.id
                    ? 'text-teal-500'
                    : 'text-gray-400 dark:text-gray-500 hover:text-teal-500'
                }`}
              >
                {item.icon}
                <span className={`text-xs mt-1 transition-opacity duration-200 opacity-0 group-hover:opacity-100 ${activeView === item.id && 'opacity-100'}`}>{item.label}</span>
              </button>
            ))}
          </div>
        </aside>
        
        <div className="md:pl-20 h-full flex flex-col">
          <Header onAssistantClick={() => setIsChatOpen(true)} userProfile={userProfile} />
          <main className="flex-grow overflow-y-auto p-4 sm:p-6 lg:p-8 pb-24 md:pb-8 custom-scrollbar">
             {renderView()}
          </main>
        </div>

        {/* Bottom Navigation */}
        <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-teal-200 dark:border-gray-700 shadow-lg md:hidden z-20">
          <div className="flex justify-around max-w-lg mx-auto">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id as View)}
                className={`flex flex-col items-center justify-center w-full pt-3 pb-2 transition-colors duration-200 ${
                  activeView === item.id
                    ? 'text-teal-500'
                    : 'text-gray-400 dark:text-gray-500 hover:text-teal-400'
                }`}
              >
                {item.icon}
                <span className="text-xs mt-1">{item.label}</span>
              </button>
            ))}
             <button
              key="profile"
              onClick={() => setActiveView('profile' as View)}
              className={`flex flex-col items-center justify-center w-full pt-3 pb-2 transition-colors duration-200 ${
                activeView === 'profile'
                  ? 'text-teal-500'
                  : 'text-gray-400 dark:text-gray-500 hover:text-teal-400'
              }`}
            >
              <UserIcon size={24} />
              <span className="text-xs mt-1">Profile</span>
            </button>
          </div>
        </nav>

        <AiChat isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
      </div>
    </ThemeContext.Provider>
  );
};

export default App;