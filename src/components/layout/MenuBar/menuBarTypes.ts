export interface MenuItem {
    label: string;
    shortcut?: string;
    action?: () => void;
    disabled?: boolean;
}

export interface MenuCategory {
    label: string;
    items: MenuItem[];
}

export type DockSide = 'left' | 'right' | 'top' | 'bottom';
