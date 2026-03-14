"use client";
import { useEffect, useState } from "react";
import { Sun, Moon, Cloud, CloudRain } from "lucide-react";

type Theme = "morning" | "afternoon" | "evening" | "night" | "rainy" | "sunny" | "cloudy";

const THEME_CLASSES: Record<Theme, string> = {
  morning: "theme-morning",
  afternoon: "theme-afternoon",
  evening: "theme-evening",
  night: "theme-night",
  rainy: "theme-rainy",
  sunny: "theme-sunny",
  cloudy: "theme-cloudy",
};

const THEME_ICONS: Record<Theme, React.ReactNode> = {
  morning: <Sun className="w-4 h-4 text-amber-400" />,
  afternoon: <Sun className="w-4 h-4 text-yellow-500" />,
  evening: <Sun className="w-4 h-4 text-orange-500" />,
  night: <Moon className="w-4 h-4 text-blue-300" />,
  rainy: <CloudRain className="w-4 h-4 text-blue-400" />,
  sunny: <Sun className="w-4 h-4 text-yellow-400" />,
  cloudy: <Cloud className="w-4 h-4 text-gray-400" />,
};

const THEMES_LIST: Theme[] = ["morning", "afternoon", "evening", "night", "rainy", "sunny", "cloudy"];

function getTimeBasedTheme(): Theme {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 12) return "morning";
  if (hour >= 12 && hour < 18) return "afternoon";
  if (hour >= 18 && hour < 22) return "evening";
  return "night";
}

export function ThemeController() {
  const [theme, setTheme] = useState<Theme>("afternoon");
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("ltsu-theme") as Theme | null;
    if (saved && THEMES_LIST.includes(saved)) {
      setTheme(saved);
      return;
    }

    // Auto-detect from time
    const timeTheme = getTimeBasedTheme();

    // Try weather API
    const weatherKey = process.env.NEXT_PUBLIC_OPENWEATHER_KEY;
    if (weatherKey && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            const { latitude, longitude } = pos.coords;
            const res = await fetch(
              `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${weatherKey}`
            );
            const data = await res.json();
            const condition = data.weather?.[0]?.main?.toLowerCase() || "";
            let weatherTheme: Theme = timeTheme;
            if (condition.includes("rain") || condition.includes("drizzle")) weatherTheme = "rainy";
            else if (condition.includes("clear")) weatherTheme = "sunny";
            else if (condition.includes("cloud")) weatherTheme = "cloudy";
            setTheme(weatherTheme);
          } catch {
            setTheme(timeTheme);
          }
        },
        () => setTheme(timeTheme)
      );
    } else {
      setTheme(timeTheme);
    }
  }, []);

  useEffect(() => {
    // Remove all theme classes and add current
    document.documentElement.classList.remove(...Object.values(THEME_CLASSES));
    document.documentElement.classList.add(THEME_CLASSES[theme]);
  }, [theme]);

  const handleSetTheme = (t: Theme) => {
    setTheme(t);
    localStorage.setItem("ltsu-theme", t);
    setIsOpen(false);
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {isOpen && (
        <div className="mb-2 bg-popover border border-border rounded-xl shadow-lg p-2 flex flex-col gap-1 w-36">
          {THEMES_LIST.map((t) => (
            <button
              key={t}
              onClick={() => handleSetTheme(t)}
              className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-left capitalize transition-colors ${
                theme === t ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted text-muted-foreground"
              }`}
            >
              {THEME_ICONS[t]}
              {t}
            </button>
          ))}
        </div>
      )}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-10 h-10 rounded-full bg-card border border-border shadow-md flex items-center justify-center hover:shadow-lg transition-shadow"
        title="Change theme"
      >
        {THEME_ICONS[theme]}
      </button>
    </div>
  );
}
