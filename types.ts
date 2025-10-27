
export type AssetType = 'character' | 'location' | 'item' | 'image';

export interface Asset {
    id: string;
    createdAt: string;
    updatedAt: string;
    type: AssetType;
    name: string;
    description: string;
    data: {
        imageUrl?: string;
        [key: string]: any;
    };
}

export interface Page {
    id:string;
    createdAt: string;
    updatedAt: string;
    title: string;
    content: string;
}

export interface Chapter {
    id: string;
    createdAt: string;
    updatedAt: string;
    title: string;
    pages: Page[];
}

export interface Project {
    id: string;
    createdAt: string;
    updatedAt: string;
    title: string;
    description: string;
    chapters: Chapter[];
    isPublished: boolean;
}
