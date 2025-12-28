import React from 'react';

interface IconProps {
  size?: number;
  className?: string;
}

export const FilesIcon: React.FC<IconProps> = ({ size = 16, className }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 16 16" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path d="M5.5 1.5H9.5L12.5 4.5V11.5C12.5 12.0523 12.0523 12.5 11.5 12.5H5.5C4.94772 12.5 4.5 12.0523 4.5 11.5V2.5C4.5 1.94772 4.94772 1.5 5.5 1.5Z" stroke="currentColor" stroke-width="1" stroke-linejoin="round"/>
    <path d="M3.5 3.5H2.5C1.94772 3.5 1.5 3.94772 1.5 4.5V13.5C1.5 14.0523 1.94772 14.5 2.5 14.5H9.5C10.0523 14.5 10.5 14.0523 10.5 13.5V12.5" stroke="currentColor" stroke-width="1" stroke-linecap="round"/>
  </svg>
);

export const SearchIcon: React.FC<IconProps> = ({ size = 16, className }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 16 16" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path d="M10.5 10.5L14.5 14.5" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M12.5 7C12.5 9.48528 10.4853 11.5 8 11.5C5.51472 11.5 3.5 9.48528 3.5 7C3.5 4.51472 5.51472 2.5 8 2.5C10.4853 2.5 12.5 4.51472 12.5 7Z" stroke="currentColor" stroke-width="1"/>
  </svg>
);

export const GitBranchIcon: React.FC<IconProps> = ({ size = 16, className }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 16 16" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <circle cx="4.5" cy="3.5" r="2" stroke="currentColor" stroke-width="1"/>
    <circle cx="4.5" cy="12.5" r="2" stroke="currentColor" stroke-width="1"/>
    <circle cx="11.5" cy="8.5" r="2" stroke="currentColor" stroke-width="1"/>
    <path d="M4.5 5.5V10.5" stroke="currentColor" stroke-width="1"/>
    <path d="M4.5 10.5C4.5 8.5 6.5 8.5 8.5 8.5H9.5" stroke="currentColor" stroke-width="1"/>
  </svg>
);

export const DebugIcon: React.FC<IconProps> = ({ size = 16, className }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 16 16" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path d="M2.5 7.5H5.5L8 10H10.5L13.5 12.5V3.5L10.5 6H8L5.5 8.5H2.5V7.5Z" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M8 6V10" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M5.5 5.5L4 4" stroke="currentColor" stroke-width="1" stroke-linecap="round"/>
    <path d="M5.5 10.5L4 12" stroke="currentColor" stroke-width="1" stroke-linecap="round"/>
  </svg>
);

export const RemoteIcon: React.FC<IconProps> = ({ size = 16, className }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 16 16" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <rect x="2.5" y="2.5" width="11" height="11" rx="1" stroke="currentColor" stroke-width="1"/>
    <circle cx="10" cy="10" r="2" stroke="currentColor" stroke-width="1"/>
    <path d="M9 9L11 11" stroke="currentColor" stroke-width="1" stroke-linecap="round"/>
    <path d="M11 9L9 11" stroke="currentColor" stroke-width="1" stroke-linecap="round"/>
  </svg>
);

export const ExtensionsIcon: React.FC<IconProps> = ({ size = 16, className }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 16 16" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <rect x="2.5" y="2.5" width="4" height="4" stroke="currentColor" stroke-width="1"/>
    <rect x="9.5" y="2.5" width="4" height="4" stroke="currentColor" stroke-width="1"/>
    <rect x="2.5" y="9.5" width="4" height="4" stroke="currentColor" stroke-width="1"/>
    <path d="M11.5 9.5L9.5 11.5L11.5 13.5L13.5 11.5L11.5 9.5Z" stroke="currentColor" stroke-width="1"/>
  </svg>
);
