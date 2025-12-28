import { DockSide } from './menuBarTypes';

export const MinimizeIcon = () => (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
        <rect x="2" y="6" width="8" height="1" fill="currentColor" />
    </svg>
);

export const MaximizeIcon = () => (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
        <rect x="2" y="2" width="8" height="8" stroke="currentColor" strokeWidth="1" fill="none" />
    </svg>
);

export const RestoreIcon = () => (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
        <rect x="3" y="3" width="6" height="6" stroke="currentColor" strokeWidth="1" fill="none" />
        <rect x="2" y="2" width="6" height="6" stroke="currentColor" strokeWidth="1" fill="none" />
    </svg>
);

export const CloseIcon = () => (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
        <path d="M2 2L10 10M10 2L2 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
);

export const TerminalDockIcon = ({ active }: { active?: boolean }) => (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <rect x="1.5" y="1.5" width="13" height="13" rx="1" stroke="currentColor" strokeWidth="1" />
        <rect x="1.5" y="12" width="13" height="1" fill={active ? '#a855f7' : 'currentColor'} opacity="0.9" />
    </svg>
);

export const DockIndicator = ({
    side,
    active,
}: {
    side: DockSide;
    active?: boolean;
}) => {
    const outline = 'currentColor';
    const fill = active ? '#a855f7' : 'currentColor';

    let rect: { x: number; y: number; w: number; h: number };
    switch (side) {
        case 'left':
            rect = { x: 2.5, y: 2.5, w: 4.5, h: 11 };
            break;
        case 'right':
            rect = { x: 9, y: 2.5, w: 4.5, h: 11 };
            break;
        case 'top':
            rect = { x: 2.5, y: 2.5, w: 11, h: 4.5 };
            break;
        case 'bottom':
            rect = { x: 2.5, y: 9, w: 11, h: 4.5 };
            break;
    }

    return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <rect x="1.5" y="1.5" width="13" height="13" rx="2" stroke={outline} strokeWidth="1" />
            <rect x={rect.x} y={rect.y} width={rect.w} height={rect.h} rx="1" fill={fill} opacity={active ? 1 : 0.9} />
        </svg>
    );
};

export const ActivitySquareIcon = ({
    active,
    position
}: {
    active?: boolean;
    position: 'left' | 'bottom' | 'right'
}) => {
    const outline = 'currentColor';
    const fill = active ? 'currentColor' : 'transparent';

    let divider: { x1: number; y1: number; x2: number; y2: number } | null = null;
    let fillPath = "";

    switch (position) {
        case 'left':
            divider = { x1: 6, y1: 1.5, x2: 6, y2: 14.5 };
            fillPath = "M3.5 1.5H6V14.5H3.5C2.4 14.5 1.5 13.6 1.5 12.5V3.5C1.5 2.4 2.4 1.5 3.5 1.5Z";
            break;
        case 'bottom':
            divider = { x1: 1.5, y1: 10, x2: 14.5, y2: 10 };
            fillPath = "M1.5 10H14.5V12.5C14.5 13.6 13.6 14.5 12.5 14.5H3.5C2.4 14.5 1.5 13.6 1.5 12.5V10Z";
            break;
        case 'right':
            divider = { x1: 10, y1: 1.5, x2: 10, y2: 14.5 };
            fillPath = "M10 1.5H12.5C13.6 1.5 14.5 2.4 14.5 3.5V12.5C14.5 13.6 13.6 14.5 12.5 14.5H10V1.5Z";
            break;
    }

    return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <rect x="1.5" y="1.5" width="13" height="13" rx="2" stroke={outline} strokeWidth="1.2" fill="none" />
            {divider && (
                <line x1={divider.x1} y1={divider.y1} x2={divider.x2} y2={divider.y2} stroke={outline} strokeWidth="1.2" />
            )}
            {active && (
                <path d={fillPath} fill={fill} opacity="0.6" style={{ pointerEvents: 'none' }} />
            )}
        </svg>
    );
};

export const AssistantIcon = ({ active }: { active?: boolean }) => {
    return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <rect x="1.5" y="1.5" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="1" />
            <line x1="8" y1="1.5" x2="8" y2="14.5" stroke="currentColor" strokeWidth="1" />
            {active && (
                <rect x="8" y="1.5" width="6.5" height="13" rx="1" fill="currentColor" opacity="0.8" />
            )}
        </svg>
    );
};

export const SettingsIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.09a2 2 0 0 1-1-1.74v-.47a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
        <circle cx="12" cy="12" r="3" />
    </svg>
);

export const ProfileIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
    </svg>
);
