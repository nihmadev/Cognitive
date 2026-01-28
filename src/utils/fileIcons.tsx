import React from 'react';
import iconTheme from './symbol-icon-theme.json';


const SYMBOLS_BASE_URL = '/icons/symbols';
const FOLDER_URL = `${SYMBOLS_BASE_URL}/folders`;
const FILE_URL = `${SYMBOLS_BASE_URL}/files`;

const getIconKey = (name: string, isDir: boolean, path?: string): string => {
    const lowerName = name.toLowerCase();

    
    const simplifiedNames = ['stderr', 'stdout', 'flycheck', 'capabilities', 'capabillitiies', '.vite-temp'];
    if (simplifiedNames.includes(lowerName)) {
        return 'folder';
    }

    if (path) {
        const isInsideNodeModules = path.includes('/node_modules/') || path.includes('\\node_modules\\');
        if (isInsideNodeModules) {
            return isDir ? 'folder' : 'document';
        }
    }

    if (isDir) {
        
        return (iconTheme.folderNames as Record<string, string>)[lowerName] || 'folder';
    }

    
    
    if ((iconTheme.fileNames as Record<string, string>)[lowerName]) {
        
        return (iconTheme.fileNames as Record<string, string>)[lowerName];
    }

    
    const parts = lowerName.split('.');

    
    if (parts.length > 2) {
        const fullExt = parts.slice(-2).join('.');
        
        if ((iconTheme.fileExtensions as Record<string, string>)[fullExt]) {
            
            return (iconTheme.fileExtensions as Record<string, string>)[fullExt];
        }
    }

    if (parts.length > 1) {
        const ext = parts[parts.length - 1];
        
        if ((iconTheme.fileExtensions as Record<string, string>)[ext]) {
            return (iconTheme.fileExtensions as Record<string, string>)[ext];
        }

        // Also check languageIds
        if ((iconTheme.languageIds as Record<string, string>)[ext]) {
            return (iconTheme.languageIds as Record<string, string>)[ext];
        }
    }

    return 'document';
};


const IconImage = ({ src, name, fallbackIcon }: { src: string; name: string; fallbackIcon?: React.ReactNode }) => {
    const [hasError, setHasError] = React.useState(false);

    React.useEffect(() => {
        setHasError(false);
    }, [src]);

    if (hasError) {
        return fallbackIcon || <DefaultFileIcon />;
    }

    return (
        <img
            src={src}
            width="16"
            height="16"
            className="flex-shrink-0"
            alt={name}
            loading="lazy"
            style={{
                aspectRatio: '1/1',
                borderRadius: '2px',
            }}
            onError={() => {
                setHasError(true);
            }}
        />
    );
};

export const getFileIcon = (filename: string, path?: string) => {
    const iconName = getIconKey(filename, false, path);
    return (
        <IconImage
            src={`${FILE_URL}/${iconName}.svg`}
            name={filename}
        />
    );
};

export const getFolderIcon = (foldername: string, isOpen: boolean = false, path?: string) => {
    let iconName = getIconKey(foldername, true, path);

    
    if (isOpen && iconName === 'folder') {
        iconName = 'folder-open';
    }

    return (
        <IconImage
            src={`${FOLDER_URL}/${iconName}.svg`}
            name={foldername}
            fallbackIcon={<DefaultFolderIcon isOpen={isOpen} />}
        />
    );
};

export const DefaultFileIcon = () => (
    <img src={`${FILE_URL}/document.svg`} width="16" height="16" alt="file" />
);

export const DefaultFolderIcon = ({ isOpen }: { isOpen?: boolean }) => (
    <img src={`${FOLDER_URL}/folder${isOpen ? '-open' : ''}.svg`} width="16" height="16" alt="folder" />
);


export const getFolderDecoration = (_name: string) => null;
export const getFolderStatus = (_: string) => null;

