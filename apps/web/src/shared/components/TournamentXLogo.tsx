import React from 'react';

export interface LogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  variant?: 'full' | 'horizontal' | 'icon' | 'wordmark';
  showText?: boolean;
  className?: string;
  onClick?: () => void;
  withGlow?: boolean;
}

export const TournamentXLogo: React.FC<LogoProps> = ({
  size = 'md',
  variant = 'horizontal',
  showText = true,
  className = '',
  onClick,
  withGlow = true
}) => {
  const interactiveProps = onClick
    ? { role: 'button', tabIndex: 0, onKeyDown: (event: React.KeyboardEvent<HTMLDivElement>) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onClick(); } }, 'aria-label': 'Ir al inicio de TournamentX' }
    : {};
  // Dimension mappings
  const dimensions = {
    xs: { icon: 'w-6 h-6', fullWidth: 'w-24', height: 28, text: 'text-sm', sub: 'text-[8px]' },
    sm: { icon: 'w-8 h-8', fullWidth: 'w-32', height: 36, text: 'text-base', sub: 'text-[9px]' },
    md: { icon: 'w-10 h-10', fullWidth: 'w-44', height: 46, text: 'text-xl', sub: 'text-[10px]' },
    lg: { icon: 'w-14 h-14', fullWidth: 'w-60', height: 60, text: 'text-2xl', sub: 'text-xs' },
    xl: { icon: 'w-20 h-20', fullWidth: 'w-80', height: 84, text: 'text-3xl', sub: 'text-sm' },
    '2xl': { icon: 'w-32 h-32', fullWidth: 'w-96', height: 130, text: 'text-5xl', sub: 'text-base' },
  }[size];

  // The Official TX Swoosh Emblem Vector
  const TXEmblem = ({ className = 'w-full h-full' }: { className?: string }) => (
    <svg
      viewBox="0 0 300 210"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${className} ${withGlow ? 'drop-shadow-[0_0_12px_rgba(255,46,131,0.35)]' : ''}`}
    >
      <defs>
        {/* Gradients */}
        <linearGradient id="txPinkGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ff459b" />
          <stop offset="100%" stopColor="#ff2e83" />
        </linearGradient>
        <linearGradient id="txWhiteGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#e2e8f0" />
        </linearGradient>
        <filter id="pinkNeonGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="6" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* TOP SWOOSH (White, dynamic tapering arc from left to top-right) */}
      <path
        d="M 52 118 C 38 78 72 34 138 20 C 182 11 228 22 254 39 C 220 28 172 23 134 29 C 78 37 48 74 54 116 Z"
        fill="url(#txWhiteGrad)"
      />

      {/* BOTTOM SWOOSH (Hot Pink, dynamic tapering arc from right to bottom-left) */}
      <path
        d="M 248 92 C 262 132 228 176 162 190 C 118 199 72 188 46 171 C 80 182 128 187 166 181 C 222 173 252 136 246 94 Z"
        fill="url(#txPinkGrad)"
        filter="url(#pinkNeonGlow)"
      />
      <path
        d="M 248 92 C 262 132 228 176 162 190 C 118 199 72 188 46 171 C 80 182 128 187 166 181 C 222 173 252 136 246 94 Z"
        fill="url(#txPinkGrad)"
      />

      {/* CENTER LETTER 'T' (Bold, italic, dynamic sports cut in White) */}
      <g transform="skewX(-14)">
        {/* Top Horizontal Bar of T */}
        <path
          d="M 100 70 L 152 70 C 158 70 162 73 162 79 L 160 89 C 160 93 156 96 151 96 L 138 96 L 132 142 C 131 147 127 151 121 151 L 105 151 C 100 151 96 147 97 142 L 103 96 L 91 96 C 85 96 82 92 83 87 L 85 78 C 86 73 90 70 96 70 Z"
          fill="#FFFFFF"
        />

        {/* Dynamic Stylized Letter 'X' in Hot Pink */}
        <path
          d="M 152 70 L 176 70 C 182 70 186 73 189 78 L 204 104 L 222 76 C 225 72 229 70 234 70 L 254 70 C 261 70 264 76 260 82 L 228 113 L 253 143 C 257 148 253 154 246 154 L 222 154 C 217 154 213 151 210 147 L 194 122 L 176 148 C 173 152 168 154 163 154 L 143 154 C 137 154 133 148 137 142 L 170 113 L 146 80 C 143 75 146 70 152 70 Z"
          fill="url(#txPinkGrad)"
          filter="url(#pinkNeonGlow)"
        />
        <path
          d="M 152 70 L 176 70 C 182 70 186 73 189 78 L 204 104 L 222 76 C 225 72 229 70 234 70 L 254 70 C 261 70 264 76 260 82 L 228 113 L 253 143 C 257 148 253 154 246 154 L 222 154 C 217 154 213 151 210 147 L 194 122 L 176 148 C 173 152 168 154 163 154 L 143 154 C 137 154 133 148 137 142 L 170 113 L 146 80 C 143 75 146 70 152 70 Z"
          fill="url(#txPinkGrad)"
        />
      </g>
    </svg>
  );

  // The Official Wordmark Vector (TurnamentX / TournamentX)
  const WordmarkSVG = ({ className = 'w-full' }: { className?: string }) => (
    <svg
      viewBox="0 0 540 110"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="wmPinkGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ff459b" />
          <stop offset="100%" stopColor="#ff2e83" />
        </linearGradient>
        <filter id="wmPinkGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Stylized 'T' with curved top left */}
      <path
        d="M 12 36 C 12 24 24 16 42 16 L 82 16 C 89 16 93 20 93 27 L 93 33 C 93 39 88 43 82 43 L 64 43 L 64 88 C 64 94 59 99 53 99 L 37 99 C 31 99 26 94 26 88 L 26 43 L 12 43 C 12 43 12 36 12 36 Z"
        fill="#FFFFFF"
      />

      {/* 'u' */}
      <path
        d="M 106 40 L 124 40 C 129 40 133 44 133 49 L 133 76 C 133 81 138 85 144 85 C 150 85 155 81 155 76 L 155 49 C 155 44 159 40 164 40 L 182 40 C 187 40 191 44 191 49 L 191 76 C 191 92 173 102 144 102 C 115 102 97 92 97 76 L 97 49 C 97 44 101 40 106 40 Z"
        fill="#FFFFFF"
      />

      {/* 'r' */}
      <path
        d="M 205 40 L 223 40 C 228 40 232 44 232 49 L 232 58 C 236 47 248 40 262 40 L 266 40 C 271 40 275 44 275 49 L 275 64 C 275 69 270 73 265 73 C 250 73 241 81 241 94 L 241 99 L 214 99 C 209 99 205 95 205 89 L 205 49 C 205 44 209 40 205 40 Z"
        fill="#FFFFFF"
      />

      {/* 'n' */}
      <path
        d="M 283 40 L 301 40 C 306 40 310 44 310 49 L 310 57 C 315 46 327 40 342 40 C 362 40 374 51 374 70 L 374 89 C 374 95 370 99 364 99 L 346 99 C 341 99 337 95 337 89 L 337 72 C 337 65 333 60 326 60 C 319 60 315 65 315 72 L 315 89 C 315 95 311 99 305 99 L 287 99 C 282 99 278 95 278 89 L 278 49 C 278 44 282 40 283 40 Z"
        fill="#FFFFFF"
      />

      {/* 'a' */}
      <path
        d="M 386 69 C 386 52 400 40 422 40 C 444 40 458 52 458 69 L 458 89 C 458 95 454 99 448 99 L 434 99 C 430 99 427 96 426 92 C 420 98 411 101 401 101 C 385 101 374 91 374 77 C 374 63 388 54 410 54 L 426 54 L 426 53 C 426 47 421 44 414 44 C 406 44 401 47 398 52 C 396 55 391 56 387 54 L 376 46 C 379 43 382 41 386 69 Z M 426 68 L 413 68 C 404 68 398 72 398 77 C 398 83 403 86 410 86 C 419 86 426 80 426 73 L 426 68 Z"
        fill="#FFFFFF"
      />

      {/* 'm' */}
      <path
        d="M 468 40 L 485 40 C 490 40 494 44 494 49 L 494 56 C 498 46 507 40 519 40 C 530 40 538 46 542 55 C 547 46 558 40 570 40 C 590 40 600 51 600 70 L 600 89 C 600 95 596 99 590 99 L 573 99 C 568 99 564 95 564 89 L 564 72 C 564 65 560 61 554 61 C 548 61 544 65 544 72 L 544 89 C 544 95 540 99 535 99 L 518 99 C 513 99 509 95 509 89 L 509 72 C 509 65 505 61 499 61 C 493 61 489 65 489 72 L 489 89 C 489 95 485 99 479 99 L 463 99 C 458 99 454 95 454 89 L 454 49 C 454 44 458 40 468 40 Z"
        fill="#FFFFFF"
        transform="scale(0.85) translate(80, 0)"
      />

      {/* Stylized 'X' in Hot Pink */}
      <path
        d="M 432 20 L 462 20 C 469 20 475 24 479 30 L 496 59 L 514 29 C 518 23 524 20 531 20 L 559 20 C 568 20 573 28 568 36 L 532 76 L 566 114 C 572 121 567 130 558 130 L 528 130 C 521 130 515 126 511 120 L 492 90 L 471 122 C 467 127 461 130 454 130 L 428 130 C 420 130 415 122 420 114 L 458 68 L 428 32 C 424 26 427 20 432 20 Z"
        fill="url(#wmPinkGrad)"
        filter="url(#wmPinkGlow)"
        transform="translate(10, -10)"
      />
      <path
        d="M 432 20 L 462 20 C 469 20 475 24 479 30 L 496 59 L 514 29 C 518 23 524 20 531 20 L 559 20 C 568 20 573 28 568 36 L 532 76 L 566 114 C 572 121 567 130 558 130 L 528 130 C 521 130 515 126 511 120 L 492 90 L 471 122 C 467 127 461 130 454 130 L 428 130 C 420 130 415 122 420 114 L 458 68 L 428 32 C 424 26 427 20 432 20 Z"
        fill="url(#wmPinkGrad)"
        transform="translate(10, -10)"
      />
    </svg>
  );

  // Se conserva como variante vectorial reutilizable del logotipo.
  void WordmarkSVG;

  // 1. FULL VERTICAL LOCKUP (Matches image.png exactly: Big Emblem top, Wordmark bottom)
  if (variant === 'full') {
    return (
      <div
        id="tournamentx-logo-full"
        onClick={onClick}
        {...interactiveProps}
        className={`flex flex-col items-center justify-center text-center cursor-pointer select-none group transition-transform duration-300 hover:scale-[1.02] ${className}`}
      >
        <div className={`${dimensions.fullWidth} relative aspect-[300/210]`}>
          <TXEmblem />
        </div>
        <div className={`${dimensions.fullWidth} mt-2`}>
          <div className="flex items-center justify-center font-brand font-black text-white tracking-tight uppercase leading-none text-4xl sm:text-5xl lg:text-6xl">
            <span>TURNAMENT</span>
            <span className="text-[#ff2e83] italic drop-shadow-[0_0_15px_rgba(255,46,131,0.8)] ml-0.5">X</span>
          </div>
        </div>
      </div>
    );
  }

  // 2. ICON ONLY (The Glowing TX Swoosh Emblem)
  if (variant === 'icon' || !showText) {
    return (
      <div
        id="tournamentx-logo-icon"
        onClick={onClick}
        {...interactiveProps}
        className={`relative ${dimensions.icon} flex items-center justify-center cursor-pointer select-none group transition-transform duration-300 hover:scale-105 ${className}`}
      >
        <TXEmblem />
      </div>
    );
  }

  // 3. WORDMARK ONLY
  if (variant === 'wordmark') {
    return (
      <div
        id="tournamentx-logo-wordmark"
        onClick={onClick}
        {...interactiveProps}
        className={`flex items-center cursor-pointer select-none group ${className}`}
      >
        <span className={`font-brand font-black tracking-tight uppercase ${dimensions.text} text-white group-hover:text-pink-50 transition-colors`}>
          TURNAMENT<span className="text-[#ff2e83] italic drop-shadow-[0_0_10px_rgba(255,46,131,0.7)] ml-0.5">X</span>
        </span>
      </div>
    );
  }

  // 4. HORIZONTAL COMPACT (Standard for Navbar & Sidebar)
  return (
    <div
      id="tournamentx-logo-horizontal"
      onClick={onClick}
      {...interactiveProps}
      className={`flex items-center gap-3 cursor-pointer select-none group ${className}`}
    >
      <div className={`relative ${dimensions.icon} flex items-center justify-center flex-shrink-0 transition-transform duration-300 group-hover:scale-105`}>
        <TXEmblem />
      </div>

      {showText && (
        <div className="flex items-center leading-none">
          <span className={`font-brand font-black tracking-tight ${dimensions.text} text-white uppercase group-hover:text-pink-50 transition-colors`}>
            TURNAMENT
          </span>
          <span className={`font-brand font-black ${dimensions.text} text-[#ff2e83] italic drop-shadow-[0_0_8px_rgba(255,46,131,0.7)] ml-0.5 group-hover:scale-110 transition-transform`}>
            X
          </span>
        </div>
      )}
    </div>
  );
};
