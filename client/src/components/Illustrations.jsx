import React from 'react';

export function SociaHeartLogo({ size = 34, className = '' }) {
  const uniqueId = React.useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const gradId = `sociaBlueGrad_${uniqueId}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id={gradId} x1="4" y1="4" x2="36" y2="36" gradientUnits="userSpaceOnUse">
          <stop stopColor="#3B82F6" />
          <stop offset="1" stopColor="#1D4ED8" />
        </linearGradient>
      </defs>
      {/* Solid fallback to guarantee background color is never blank/white on mobile/WebKit */}
      <circle cx="20" cy="20" r="19" fill="#2563EB" />
      <circle cx="20" cy="20" r="19" fill={`url(#${gradId})`} stroke="#D9ECFF" strokeWidth="1.5" />
      <path
        d="M20 29.2C20 29.2 10.5 23.2 10.5 16.3C10.5 13.2 12.9 10.8 15.8 10.8C17.6 10.8 19.2 11.7 20 13.1C20.8 11.7 22.4 10.8 24.2 10.8C27.1 10.8 29.5 13.2 29.5 16.3C29.5 23.2 20 29.2 20 29.2Z"
        stroke="white"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="rgba(255,255,255,0.18)"
      />
    </svg>
  );
}

export function StudentAvatar({ style = 'student-female', size = 34 }) {
  const isMale = style === 'student-male';
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 44 44"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0"
    >
      <circle cx="22" cy="22" r="21" fill="#CBE2FA" stroke="#99C2EE" strokeWidth="1.5" />
      {/* Shoulders / Shirt */}
      <path d="M9 39C10.5 32.5 15.5 30 22 30C28.5 30 33.5 32.5 35 39" fill="#3B76B8" />
      <path d="M18 30L22 35L26 30" fill="#FFFFFF" />
      {/* Hair back */}
      {!isMale && <path d="M13 18C13 12 31 12 31 18L32 29H12L13 18Z" fill="#232B38" />}
      {/* Face */}
      <circle cx="22" cy="20" r="7.5" fill="#FBD3B6" />
      {/* Hair front */}
      {isMale ? (
        <path
          d="M14.5 18.5C14.5 13.5 18 11 22 11C26.5 11 29.5 13.5 29.5 18.5C27 16 24 15.5 20 16C17.5 16.3 15.5 17.5 14.5 18.5Z"
          fill="#232B38"
        />
      ) : (
        <path
          d="M14.2 19C14.5 13.5 18 11.2 22 11.2C26 11.2 29.5 13.5 29.8 19C27.5 16 24.5 15 22 15C19.5 15 16.5 16 14.2 19Z"
          fill="#232B38"
        />
      )}
      {/* Eyes & Smile */}
      <circle cx="19.5" cy="20.2" r="1" fill="#1E293B" />
      <circle cx="24.5" cy="20.2" r="1" fill="#1E293B" />
      <path
        d="M19.8 23.2C20.5 24 23.5 24 24.2 23.2"
        stroke="#B45309"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function TopicFriendshipIllustration() {
  return (
    <svg width="78" height="58" viewBox="0 0 84 62" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Left Person */}
      <path d="M10 56C11 46 16 43 23 43C30 43 35 46 36 56" fill="#5A95D6" />
      <circle cx="23" cy="29" r="8.5" fill="#F8CBA6" />
      <path d="M14.5 28C14.5 21 18.5 18.5 23 18.5C27.5 18.5 31.5 21 31.5 28C28.5 24.5 17.5 24.5 14.5 28Z" fill="#2A3342" />
      {/* Right Person */}
      <path d="M48 56C49 46 54 43 61 43C68 43 73 46 74 56" fill="#6BA4E0" />
      <circle cx="61" cy="29" r="8.5" fill="#F8CBA6" />
      <path d="M52 34L53 23C53 18 69 18 69 23L70 34H52Z" fill="#2A3342" />
      <circle cx="61" cy="29" r="8" fill="#F8CBA6" />
      <path d="M53 27C54 21 58 19.5 61 19.5C64 19.5 68 21 69 27C65 24 57 24 53 27Z" fill="#2A3342" />
      {/* Center Person */}
      <path d="M27 58C28.5 46 34 42 42 42C50 42 55.5 46 57 58" fill="#2B6CB0" />
      <path d="M37 42L42 49L47 42" fill="white" />
      <circle cx="42" cy="26" r="9.5" fill="#FAD5B8" />
      <path d="M32.5 25C32.5 18 37 15 42 15C47 15 51.5 18 51.5 25C48 21.5 36 21.5 32.5 25Z" fill="#1E2631" />
      <circle cx="39" cy="26.5" r="1.1" fill="#1E293B" />
      <circle cx="45" cy="26.5" r="1.1" fill="#1E293B" />
      <path d="M40 30.5C41 29.8 43 29.8 44 30.5" stroke="#9A3412" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

export function TopicCommunicationIllustration() {
  return (
    <svg width="74" height="58" viewBox="0 0 78 60" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Back speech bubble */}
      <rect x="28" y="10" width="38" height="27" rx="8" fill="#A3CAF5" />
      <path d="M58 37L63 44L51 37H58Z" fill="#A3CAF5" />
      {/* Front speech bubble */}
      <rect x="12" y="17" width="42" height="29" rx="9" fill="#3B82F6" />
      <path d="M19 46L14 53L27 46H19Z" fill="#3B82F6" />
      {/* 3 White Dots */}
      <circle cx="24" cy="31.5" r="2.6" fill="white" />
      <circle cx="33" cy="31.5" r="2.6" fill="white" />
      <circle cx="42" cy="31.5" r="2.6" fill="white" />
    </svg>
  );
}

export function TopicConfidenceIllustration() {
  return (
    <svg width="74" height="58" viewBox="0 0 76 60" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Sparkles */}
      <path d="M18 18L20 14L22 18L26 20L22 22L20 26L18 22L14 20L18 18Z" fill="#60A5FA" />
      <circle cx="58" cy="18" r="2.5" fill="#93C5FD" />
      {/* Hair back */}
      <path d="M26 24C26 15 50 15 50 24L52 42H24L26 24Z" fill="#232B38" />
      {/* Body */}
      <path d="M19 56C21 44 28 40 38 40C48 40 55 44 57 56" fill="#4B89DC" />
      <path d="M33 40L38 47L43 40" fill="#FDE68A" />
      {/* Head */}
      <circle cx="38" cy="26" r="10" fill="#FAD5B8" />
      <path d="M28 25C28.5 17.5 33 15 38 15C43 15 47.5 17.5 48 25C44.5 21 31.5 21 28 25Z" fill="#232B38" />
      <circle cx="35" cy="26.5" r="1.2" fill="#1E293B" />
      <circle cx="41" cy="26.5" r="1.2" fill="#1E293B" />
      <path d="M35.5 30C36.8 31.2 39.2 31.2 40.5 30" stroke="#9A3412" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

export function TopicBullyingIllustration() {
  return (
    <svg width="70" height="58" viewBox="0 0 70 58" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="35" cy="29" r="20" fill="#FEE2E2" />
      <circle cx="35" cy="29" r="16" stroke="#EF4444" strokeWidth="5" fill="white" />
      <line x1="24" y1="18" x2="46" y2="40" stroke="#EF4444" strokeWidth="5" strokeLinecap="round" />
    </svg>
  );
}

export function ExtraTipsIcon({ size = 38 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="24" cy="24" r="20" fill="#FEF3C7" />
      <path d="M24 8V11M12.7 12.7L14.8 14.8M8 24H11M35.3 12.7L33.2 14.8M40 24H37" stroke="#F59E0B" strokeWidth="2.4" strokeLinecap="round" />
      <path
        d="M17 23C17 18.6 20.1 15 24 15C27.9 15 31 18.6 31 23C31 25.8 29.4 28.1 27.5 29.6L27 33H21L20.5 29.6C18.6 28.1 17 25.8 17 23Z"
        fill="#FBBF24"
        stroke="#D97706"
        strokeWidth="1.8"
      />
      <rect x="20.5" y="33.5" width="7" height="3.5" rx="1.5" fill="#94A3B8" />
      <path d="M22 38.5H26" stroke="#64748B" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function ExtraArticleIcon({ size = 38 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="24" cy="24" r="20" fill="#E0F2FE" />
      <path
        d="M12 16C12 14.9 12.9 14 14 14H22C23.1 14 24 14.9 24 16V34C24 33.2 23.1 32.5 22 32.5H14C12.9 32.5 12 31.6 12 30.5V16Z"
        fill="#3B82F6"
      />
      <path
        d="M36 16C36 14.9 35.1 14 34 14H26C24.9 14 24 14.9 24 16V34C24 33.2 24.9 32.5 26 32.5H34C35.1 32.5 36 31.6 36 30.5V16Z"
        fill="#93C5FD"
      />
      <line x1="15.5" y1="19.5" x2="21" y2="19.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="15.5" y1="23.5" x2="21" y2="23.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="27" y1="19.5" x2="32.5" y2="19.5" stroke="#1E40AF" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="27" y1="23.5" x2="32.5" y2="23.5" stroke="#1E40AF" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function ExtraGuruBkIcon({ size = 38 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="24" cy="24" r="20" fill="#DBEAFE" />
      <path d="M14 37C15 31 19 29 24 29C29 29 33 31 34 37" fill="#2563EB" />
      <circle cx="24" cy="20" r="6.5" fill="#FAD5B8" />
      <path d="M17.5 19.5C18 14.5 20.5 13 24 13C27.5 13 30 14.5 30.5 19.5C28 17 20 17 17.5 19.5Z" fill="#1E293B" />
      {/* Headset */}
      <path d="M16 20C16 14.8 19.6 11 24 11C28.4 11 32 14.8 32 20" stroke="#1D4ED8" strokeWidth="2.3" strokeLinecap="round" />
      <rect x="14" y="18" width="3.5" height="6" rx="1.7" fill="#1E40AF" />
      <rect x="30.5" y="18" width="3.5" height="6" rx="1.7" fill="#1E40AF" />
      <path d="M32 23.5C32 26 29 27 26 27" stroke="#1E40AF" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function ExtraHistoryIcon({ size = 38 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="24" cy="24" r="20" fill="#E0F2FE" />
      <circle cx="24" cy="24" r="11.5" fill="#93C5FD" stroke="#2563EB" strokeWidth="2.2" />
      <circle cx="24" cy="24" r="9" fill="white" />
      <path d="M24 18.5V24L27.5 26.5" stroke="#1D4ED8" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
