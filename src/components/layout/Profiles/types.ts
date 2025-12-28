export interface Profile {
    id: string;
    name: string;
    isActive: boolean;
    isDefault: boolean;
    folders: { host: string; path: string }[];
    useForNewWindows: boolean;
}

export interface ContentItem {
    id: string;
    label: string;
    icon: React.ReactNode;
    expandable?: boolean;
    navigateTo?: string;
}

export interface EditingFolder {
    profileId: string;
    index: number;
    field: 'host' | 'path';
}
