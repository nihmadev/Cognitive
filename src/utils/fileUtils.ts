/**
 * Utility function to remove file extension from filename
 * @param filename - The filename with extension
 * @returns The filename without extension
 */
export const removeFileExtension = (filename: string): string => {
    const lastDotIndex = filename.lastIndexOf('.');
    return lastDotIndex > 0 ? filename.substring(0, lastDotIndex) : filename;
};
