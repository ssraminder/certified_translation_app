import React from 'react';

type IconProps = {
  className?: string;
};

export const CopyIcon: React.FC<IconProps> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    className={className}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75"
    />
  </svg>
);

export const CheckIcon: React.FC<IconProps> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    className={className}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M4.5 12.75l6 6 9-13.5"
    />
  </svg>
);

export const ReactIcon: React.FC<IconProps> = ({ className }) => (
  <svg className={className} viewBox="-11.5 -10.23174 23 20.46348" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="0" cy="0" r="2.05" fill="currentColor"></circle>
    <g stroke="currentColor" strokeWidth="1" fill="none">
      <ellipse rx="11" ry="4.2"></ellipse>
      <ellipse rx="11" ry="4.2" transform="rotate(60)"></ellipse>
      <ellipse rx="11" ry="4.2" transform="rotate(120)"></ellipse>
    </g>
  </svg>
);

export const ViteIcon: React.FC<IconProps> = ({ className }) => (
    <svg className={className} viewBox="0 0 256 257" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <linearGradient id="a" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" style={{stopColor: '#42D392'}}/>
                <stop offset="100%" style={{stopColor: '#647EFF'}}/>
            </linearGradient>
        </defs>
        <path fill="url(#a)" d="M255.424 63.588c-1.176-3.348-4.044-5.832-7.524-6.42l-96.252-16.512a12 12 0 00-10.992 0L44.424 57.168c-3.48.588-6.348 3.072-7.524 6.42L.588 184.44a8.016 8.016 0 007.524 9.984h35.844c3.408 0 6.48-2.316 7.644-5.592l20.4-56.988 42.12 72.156a7.92 7.92 0 006.888 4.02h38.28c3.408 0 6.48-2.316 7.644-5.592l58.32-162.336a8.016 8.016 0 00-.912-8.472z" />
        <path fill="#FFC107" d="M141.673 208.956c-2.34-6.528-8.256-10.992-15.288-10.992h-36.216c-7.032 0-12.948 4.464-15.288 10.992l-23.364 64.956c-1.176 3.276.516 6.96 3.816 8.136l31.596 11.412a12 12 0 0010.992 0l31.596-11.412c3.3-1.176 4.992-4.86 3.816-8.136l-23.364-64.956z" transform="translate(0 -64)"/>
    </svg>
);

export const GithubIcon: React.FC<IconProps> = ({ className }) => (
    <svg className={className} viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
        <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z"></path>
    </svg>
);

export const NetlifyIcon: React.FC<IconProps> = ({ className }) => (
    <svg className={className} viewBox="0 0 54 59" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M27 58.2915C12.112 58.2915 0 46.1795 0 31.2915C0 26.6075 1.488 22.2515 4.14 18.5795L24.168 51.5315C25.008 52.8875 26.496 53.6075 27.984 53.6075C29.64 53.6075 31.128 52.7275 31.968 51.2035L50.028 18.2515C52.512 22.2515 54 26.6075 54 31.2915C54 46.1795 41.888 58.2915 27 58.2915Z" fill="#00C7B7"></path>
        <path d="M49.86 16.4517L30.006 49.2437C29.166 50.5997 27.678 51.3197 26.19 51.3197C24.534 51.3197 23.046 50.4397 22.206 48.9157L4.14 15.9637C6.624 7.64768 14.868 1.48768 24.366 0.31168L27 0.0356797L29.634 0.31168C39.132 1.48768 47.376 7.64768 49.86 16.4517Z" fill="#2D3E50"></path>
    </svg>
);

export const ServerIcon: React.FC<IconProps> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    className={className}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M5.25 14.25h13.5m-13.5 0a3 3 0 01-3-3V7.5a3 3 0 013-3h13.5a3 3 0 013 3v3.75a3 3 0 01-3 3m-13.5 0v4.5a3 3 0 003 3h7.5a3 3 0 003-3v-4.5m-4.5-.75h.008v.008h-.008v-.008z"
    />
  </svg>
);

export const SupabaseIcon: React.FC<IconProps> = ({ className }) => (
    <svg className={className} viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M21.2132 19.3331C21.2132 23.7731 16.92 27.3331 12.25 27.3331C7.57999 27.3331 3.28662 23.7731 3.28662 19.3331C3.28662 14.8931 7.57999 11.3331 12.25 11.3331C16.92 11.3331 21.2132 14.8931 21.2132 19.3331Z" fill="currentColor"></path>
        <path d="M24.7134 6.6665C24.7134 11.1065 20.42 14.6665 15.75 14.6665C11.08 14.6665 6.78662 11.1065 6.78662 6.6665C6.78662 2.2265 11.08 -1.3335 15.75 -1.3335C20.42 -1.3335 24.7134 2.2265 24.7134 6.6665Z" transform="translate(0 2)" fill="currentColor"></path>
    </svg>
);