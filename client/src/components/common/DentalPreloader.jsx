import React from 'react';

export default function DentalPreloader({
  fullScreen = true,
  message = 'Loading your clinic dashboard',
  subMessage = 'Fetching patient records',
  error = null,
  onRetry = null,
}) {
  const content = (
    <div className="flex flex-col items-center justify-center p-6 text-center space-y-4">
      {error ? (
        <div className="space-y-3 max-w-md">
          <div className="h-16 w-16 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto text-2xl font-bold">
            !
          </div>
          <h3 className="font-display text-base font-bold text-ink">
            Couldn't load your dashboard
          </h3>
          <p className="text-xs text-ink-soft">
            {typeof error === 'string'
              ? error
              : 'Failed to fetch initial clinic data. Please check your connection and try again.'}
          </p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="btn-primary text-xs py-2.5 px-5 font-bold inline-flex items-center gap-2 mx-auto shadow-md"
            >
              Retry Loading
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Tooth Icon with Spinning Ring Container */}
          <div className="relative flex items-center justify-center h-24 w-24">
            {/* Outer Spinning Teal Ring */}
            <svg
              className="absolute inset-0 h-full w-full animate-spin text-[#0F6E56]"
              viewBox="0 0 100 100"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle
                cx="50"
                cy="50"
                r="44"
                stroke="currentColor"
                strokeWidth="5"
                strokeDasharray="85 200"
                strokeLinecap="round"
                opacity="0.9"
              />
            </svg>

            {/* Inner Gently Pulsing Tooth SVG in Clinic Teal (#0F6E56) */}
            <div className="animate-pulse text-[#0F6E56]">
              <svg
                className="h-11 w-11 fill-current"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M17 2C14.8 2 13 3.2 12 4.6C11 3.2 9.2 2 7 2C3.7 2 1 4.7 1 8C1 11.8 3.2 15.3 5.5 18.2C6.8 19.8 8.1 21.2 9.2 22.1C9.7 22.5 10.3 22.5 10.8 22.1C11.5 21.5 12 20.5 12 18.5C12 17.1 12.4 16 13 16C13.6 16 14 17.1 14 18.5C14 20.5 14.5 21.5 15.2 22.1C15.7 22.5 16.3 22.5 16.8 22.1C17.9 21.2 19.2 19.8 20.5 18.2C22.8 15.3 25 11.8 25 8C25 4.7 22.3 2 19 2M12 7C12.5 7 13 7.4 13 8V12C13 12.6 12.5 13 12 13C11.5 13 11 12.6 11 12V8C11 7.4 11.5 7 12 7Z" />
              </svg>
            </div>
          </div>

          {/* Status Message */}
          <div className="space-y-1">
            <h3 className="font-display text-sm font-bold text-ink tracking-wide">
              {message}
            </h3>
            {subMessage && (
              <p className="text-xs text-ink-soft animate-pulse">
                {subMessage}
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg/95 backdrop-blur-md">
        {content}
      </div>
    );
  }

  return content;
}
