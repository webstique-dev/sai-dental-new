import React, { useState, useEffect } from 'react';

export default function DentalPreloader({
  fullScreen = true,
  isLoading = true,
  error = null,
  onRetry = null,
}) {
  const [shouldRender, setShouldRender] = useState(isLoading || Boolean(error));
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    if (!isLoading && !error) {
      setIsFadingOut(true);
      const timer = setTimeout(() => {
        setShouldRender(false);
        setIsFadingOut(false);
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setShouldRender(true);
      setIsFadingOut(false);
    }
  }, [isLoading, error]);

  if (!shouldRender) return null;

  const content = (
    <div className="flex flex-col items-center justify-center p-6 text-center">
      {error ? (
        <div className="space-y-4 max-w-md bg-[#041d38] border border-blue-900/60 p-6 rounded-3xl shadow-2xl animate-fade-in">
          <div className="h-14 w-14 rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center mx-auto text-2xl font-bold">
            !
          </div>
          <div className="space-y-1">
            <h3 className="font-display text-base font-bold text-white">
              Unable to load workspace
            </h3>
            <p className="text-xs text-slate-400">
              {typeof error === 'string'
                ? error
                : 'Failed to connect to clinic services. Please check your network connection.'}
            </p>
          </div>
          {onRetry && (
            <button
              onClick={onRetry}
              className="w-full rounded-full bg-[linear-gradient(135deg,#1E64EA_0%,#2090F0_50%,#14C9FE_100%)] text-white py-3 px-6 text-xs font-bold shadow-lg shadow-blue-500/25 hover:brightness-110 active:scale-[0.99] transition-all"
            >
              Retry Connection
            </button>
          )}
        </div>
      ) : (
        <div className="relative flex items-center justify-center">
          {/* Style definition for outline drawing, gradient fill & breathing pulse animations */}
          <style>{`
            @keyframes saiToothDrawFill {
              0% {
                stroke-dasharray: 320;
                stroke-dashoffset: 320;
                fill-opacity: 0;
                stroke: url(#saiDentalToothGrad);
                stroke-width: 3.5;
              }
              40% {
                stroke-dashoffset: 0;
                fill-opacity: 0.15;
                stroke: url(#saiDentalToothGrad);
                stroke-width: 3;
              }
              70%, 100% {
                stroke-dashoffset: 0;
                fill-opacity: 1;
                fill: url(#saiDentalToothGrad);
                stroke: transparent;
                stroke-width: 0;
              }
            }

            @keyframes saiPlusFadeShine {
              0%, 35% {
                opacity: 0;
                transform: scale(0.85);
                transform-origin: center;
              }
              65% {
                opacity: 1;
                transform: scale(1);
                transform-origin: center;
                filter: drop-shadow(0 0 10px rgba(255, 255, 255, 0.95));
              }
              85%, 100% {
                opacity: 0.95;
                transform: scale(1);
                transform-origin: center;
                filter: drop-shadow(0 0 4px rgba(255, 255, 255, 0.6));
              }
            }

            @keyframes saiLogoBreathingPulse {
              0%, 100% {
                transform: scale(1);
                filter: drop-shadow(0 0 18px rgba(20, 201, 254, 0.35));
              }
              50% {
                transform: scale(1.06);
                filter: drop-shadow(0 0 32px rgba(20, 201, 254, 0.65));
              }
            }

            .sai-tooth-draw-and-fill {
              animation: saiToothDrawFill 3.2s cubic-bezier(0.4, 0, 0.2, 1) infinite;
            }

            .sai-plus-shine-fade {
              animation: saiPlusFadeShine 3.2s cubic-bezier(0.4, 0, 0.2, 1) infinite;
            }

            .sai-logo-pulse {
              animation: saiLogoBreathingPulse 3.2s ease-in-out infinite;
            }
          `}</style>

          {/* Centered Stylized Tooth + Medical Plus Sign Logo SVG */}
          <div className="sai-logo-pulse">
            <svg
              viewBox="0 0 100 100"
              className="w-28 h-28 sm:w-36 sm:h-36 md:w-44 md:h-44 overflow-visible"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                {/* 135-degree linear gradient: Deep Blue #1E64EA -> Mid Blue #2090F0 -> Cyan #14C9FE */}
                <linearGradient id="saiDentalToothGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#1E64EA" />
                  <stop offset="50%" stopColor="#2090F0" />
                  <stop offset="100%" stopColor="#14C9FE" />
                </linearGradient>

                {/* Pure white to soft cyan gradient for the medical plus sign */}
                <linearGradient id="saiDentalPlusGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.98" />
                  <stop offset="100%" stopColor="#E0F2FE" stopOpacity="0.85" />
                </linearGradient>
              </defs>

              {/* Soft Ambient Radial Blur Glow Backdrop */}
              <path
                d="M 50 8 C 33 8 16 18 16 40 C 16 58 26 76 35 90 C 41 97 46 99 48.5 99 C 49.5 99 50 92 50 84 C 50 92 50.5 99 51.5 99 C 54 99 59 97 65 90 C 74 76 84 58 84 40 C 84 18 67 8 50 8 Z"
                fill="none"
                stroke="url(#saiDentalToothGrad)"
                strokeWidth="6"
                opacity="0.25"
                className="blur-md"
              />

              {/* Stylized Tooth Contour (Line Draws in, then Fills with Gradient) */}
              <path
                d="M 50 8 C 33 8 16 18 16 40 C 16 58 26 76 35 90 C 41 97 46 99 48.5 99 C 49.5 99 50 92 50 84 C 50 92 50.5 99 51.5 99 C 54 99 59 97 65 90 C 74 76 84 58 84 40 C 84 18 67 8 50 8 Z"
                className="sai-tooth-draw-and-fill"
              />

              {/* Centered Medical Plus Sign (Fades in with subtle shine) */}
              <path
                d="M 44 34 C 44 32.5 45.2 31.5 46.5 31.5 H 53.5 C 54.8 31.5 56 32.5 56 34 V 44 H 66 C 67.5 44 68.5 45.2 68.5 46.5 V 53.5 C 68.5 54.8 67.5 56 66 56 H 56 V 66 C 56 67.5 54.8 68.5 53.5 68.5 H 46.5 C 45.2 68.5 44 67.5 44 66 V 56 H 34 C 32.5 56 31.5 54.8 31.5 53.5 V 46.5 C 31.5 45.2 32.5 44 34 44 H 44 V 34 Z"
                fill="url(#saiDentalPlusGrad)"
                className="sai-plus-shine-fade"
              />
            </svg>
          </div>
        </div>
      )}
    </div>
  );

  const transitionClasses = `transition-opacity duration-500 ease-out select-none ${
    isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
  }`;

  if (fullScreen) {
    return (
      <div className={`fixed inset-0 z-50 flex items-center justify-center bg-[#001428] ${transitionClasses}`}>
        {content}
      </div>
    );
  }

  return (
    <div className={`w-full py-12 flex items-center justify-center bg-[#001428] ${transitionClasses}`}>
      {content}
    </div>
  );
}
