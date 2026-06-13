import { useState, useEffect } from "react";
import { Sun, Moon, Sparkles } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";

const PUBLIC_PATHS = /^\/(login|signin|auth\/login|join|landing)(\/|$)/;

export default function FirstTimeThemeSelector() {
  const [showModal, setShowModal] = useState(false);
  const { setTheme } = useTheme();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    const themeSelected = localStorage.getItem("theme-selected");
    const onPublicAuth = PUBLIC_PATHS.test(window.location.pathname);

    // Never block login — default dark and ask for theme after sign-in.
    if (onPublicAuth || isLoading || !user) {
      if (onPublicAuth && !themeSelected) {
        localStorage.setItem("theme-selected", "true");
        setTheme("dark");
      }
      setShowModal(false);
      return;
    }

    if (!themeSelected) {
      setShowModal(true);
    }
  }, [isLoading, user, setTheme]);

  const handleThemeSelection = (selectedTheme: "light" | "dark") => {
    setTheme(selectedTheme);
    localStorage.setItem("theme-selected", "true");
    setShowModal(false);
  };

  if (!showModal) {
    return null;
  }

  return (
    <AnimatePresence>
      {showModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
          data-testid="modal-theme-selector"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="max-w-md w-full bg-[#121212] p-6 rounded-2xl shadow-2xl"
          >
            <div className="text-center mb-6">
              <div className="flex items-center justify-center mb-3">
                <Sparkles className="w-6 h-6 mr-2" style={{ color: 'var(--surna-text)' }} />
                <h1 className="text-2xl font-black text-white tracking-tight">SURNA</h1>
              </div>
              <h2 className="text-lg font-bold text-white mb-1">Choose Your Theme</h2>
              <p className="text-[#B3B3B3] text-sm">You can change this anytime in settings</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => handleThemeSelection("dark")}
                className="relative group overflow-hidden rounded-xl p-4 transition-all duration-300 bg-[#000000] border border-white/10 hover:border-white/30"
                data-testid="card-dark-theme"
              >
                <div className="flex flex-col items-center gap-3">
                  <Moon className="w-8 h-8 text-white" />
                  <h3 className="text-base font-bold text-white">Dark</h3>
                  <div className="flex gap-1.5 w-full">
                    <div className="h-6 flex-1 rounded bg-[#000000]" />
                    <div className="h-6 flex-1 rounded bg-[#121212]" />
                    <div className="h-6 flex-1 rounded bg-[#1E1E1E]" />
                  </div>
                  <div className="flex gap-1 mt-1">
                    <div className="w-3 h-3 rounded-full bg-white" />
                    <div className="w-3 h-3 rounded-full bg-white" />
                    <div className="w-3 h-3 rounded-full bg-[#B3B3B3]" />
                  </div>
                </div>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => handleThemeSelection("light")}
                className="relative group overflow-hidden rounded-xl p-4 transition-all duration-300 bg-[#F5F5F5] border border-black/10 hover:border-black/30"
                data-testid="card-light-theme"
              >
                <div className="flex flex-col items-center gap-3">
                  <Sun className="w-8 h-8 text-[#1A1A1A]" />
                  <h3 className="text-base font-bold text-[#1A1A1A]">Light</h3>
                  <div className="flex gap-1.5 w-full">
                    <div className="h-6 flex-1 rounded bg-white" />
                    <div className="h-6 flex-1 rounded bg-[#EBEBEB]" />
                    <div className="h-6 flex-1 rounded bg-[#D4D4D4]" />
                  </div>
                  <div className="flex gap-1 mt-1">
                    <div className="w-3 h-3 rounded-full bg-[#1A1A1A]" />
                    <div className="w-3 h-3 rounded-full bg-[#1A1A1A]" />
                    <div className="w-3 h-3 rounded-full bg-[#666666]" />
                  </div>
                </div>
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
