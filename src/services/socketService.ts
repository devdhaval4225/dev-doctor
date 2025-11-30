
// This file is deprecated in favor of services/api.ts
// Keeping file structure but exporting nothing or minimal to prevent build breaks during transition if imports exist
export const socketService = {
    // Placeholder to prevent crash if still imported somewhere before full migration
    emit: (event: string, data?: any) => { console.warn('Socket service deprecated', event); },
    on: (event: string, cb: any) => {},
    connect: (token: string) => {}
};
