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
          {/* Keyframe animation definitions for exact tooth-svgrepo structure */}
          <style>{`
            @keyframes saiToothDrawFill {
              0% {
                stroke-dasharray: 2400;
                stroke-dashoffset: 2400;
                fill-opacity: 0;
                stroke: url(#saiDentalToothGrad);
                stroke-width: 14;
              }
              40% {
                stroke-dashoffset: 0;
                fill-opacity: 0.15;
                stroke: url(#saiDentalToothGrad);
                stroke-width: 10;
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
                transform-origin: 256px 195px;
              }
              65% {
                opacity: 1;
                transform: scale(1);
                transform-origin: 256px 195px;
                filter: drop-shadow(0 0 14px rgba(255, 255, 255, 0.95));
              }
              85%, 100% {
                opacity: 0.95;
                transform: scale(1);
                transform-origin: 256px 195px;
                filter: drop-shadow(0 0 6px rgba(255, 255, 255, 0.6));
              }
            }

            @keyframes saiLogoBreathingPulse {
              0%, 100% {
                transform: scale(1);
                filter: drop-shadow(0 0 20px rgba(20, 201, 254, 0.35));
              }
              50% {
                transform: scale(1.06);
                filter: drop-shadow(0 0 36px rgba(20, 201, 254, 0.7));
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

          {/* Centered Tooth Logo SVG using tooth-svgrepo-com structure */}
          <div className="sai-logo-pulse">
            <svg
              viewBox="0 0 512 512"
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

              {/* Ambient Glow Blur Backdrop */}
              <g opacity="0.25" className="blur-lg">
                <path
                  d="M366.933,0c-55.125,0-73.924,14.131-87.654,24.448c-8.047,6.042-12.902,9.685-23.279,9.685c-10.291,0-15.01-3.601-22.835-9.583C219.588,14.191,201.011,0,145.067,0C52.796,0,34.133,24.405,34.133,145.067c0,58.974,30.601,113.05,51.482,143.13c1.425,11.213,2.671,25.216,3.968,40.098C96.375,405.828,105.685,512,162.133,512c42.513,0,49.408-34.756,56.073-68.369c5.632-28.365,11.972-60.288,37.794-82.799c25.822,22.511,32.162,54.434,37.794,82.799c6.665,33.613,13.56,68.369,56.073,68.369c1.024,0,2.039-0.188,3.004-0.546c54.34-20.378,63.232-116.403,69.717-186.513c1.246-13.389,2.432-26.018,3.789-36.736c20.89-30.08,51.49-84.156,51.49-143.138C477.867,24.405,459.213,0,366.933,0z"
                  fill="url(#saiDentalToothGrad)"
                />
              </g>

              {/* Main Tooth Structure Path (tooth-svgrepo-com.svg) with Line Draw & Gradient Fill */}
              <path
                d="M366.933,0c-55.125,0-73.924,14.131-87.654,24.448c-8.047,6.042-12.902,9.685-23.279,9.685c-10.291,0-15.01-3.601-22.835-9.583C219.588,14.191,201.011,0,145.067,0C52.796,0,34.133,24.405,34.133,145.067c0,58.974,30.601,113.05,51.482,143.13c1.425,11.213,2.671,25.216,3.968,40.098C96.375,405.828,105.685,512,162.133,512c42.513,0,49.408-34.756,56.073-68.369c5.632-28.365,11.972-60.288,37.794-82.799c25.822,22.511,32.162,54.434,37.794,82.799c6.665,33.613,13.56,68.369,56.073,68.369c1.024,0,2.039-0.188,3.004-0.546c54.34-20.378,63.232-116.403,69.717-186.513c1.246-13.389,2.432-26.018,3.789-36.736c20.89-30.08,51.49-84.156,51.49-143.138C477.867,24.405,459.213,0,366.933,0z M394.684,301.534c-3.123,3.524-2.799,8.917,0.717,12.049c1.621,1.434,3.652,2.15,5.666,2.15c1.971,0,3.866-0.836,5.453-2.185c-0.307,3.226-0.614,6.494-0.922,9.813c-6.007,64.913-14.216,153.549-57.31,171.554c-25.847-0.717-30.78-19.413-37.76-54.605c-6.255-31.514-14.037-70.741-49.408-97.271c-3.038-2.27-7.202-2.27-10.24,0c-35.371,26.53-43.153,65.758-49.408,97.271c-7.125,35.891-12.109,54.622-39.339,54.622c-40.815,0-50.031-105.25-55.552-168.124c-0.401-4.54-0.794-8.96-1.178-13.303c3.183,2.782,7.945,2.953,11.196,0.077c3.516-3.132,3.84-8.525,0.717-12.049c-0.666-0.742-66.116-75.477-66.116-156.467c0-117.743,15.386-128,93.867-128c50.167,0,65.459,11.674,77.739,21.052C231.236,44.553,239.94,51.2,256,51.2c16.077,0,24.943-6.665,33.527-13.116c12.467-9.361,27.981-21.018,77.406-21.018c77.286,0,93.867,11.025,93.867,128C460.8,226.057,395.349,300.792,394.684,301.534z"
                className="sai-tooth-draw-and-fill"
              />

              {/* Upper Accent Path from tooth-svgrepo-com.svg */}
              <path
                d="M363.349,43.452c-4.267,1.98-6.135,7.031-4.156,11.307c1.954,4.275,7.04,6.161,11.307,4.19c6.195-2.833,25.54-9.233,33.067-1.715c5.692,5.692,6.025,11.017,6.033,11.034c0,4.71,3.814,8.533,8.533,8.533c4.719,0,8.533-3.823,8.533-8.533c0-1.237-0.307-12.382-11.034-23.1C398.421,27.964,366.899,41.822,363.349,43.452z"
                fill="url(#saiDentalToothGrad)"
                opacity="0.85"
              />

              {/* Centered Medical Plus Sign inside Tooth Body (Shines & Fades In) */}
              <path
                d="M 232 142 C 232 136 236 132 242 132 H 270 C 276 132 280 136 280 142 V 176 H 314 C 320 176 324 180 324 186 V 214 C 324 220 320 224 314 224 H 280 V 258 C 280 264 276 268 270 268 H 242 C 236 268 232 264 232 258 V 224 H 198 C 192 224 188 220 188 214 V 186 C 188 180 192 176 198 176 H 232 V 142 Z"
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
