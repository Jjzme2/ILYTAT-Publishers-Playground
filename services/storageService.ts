
// Fix: Imported Chapter and Page types.
import type { Project, Asset, Chapter, Page, AssetType } from '../types';

const PROJECTS_KEY = 'digital-publishing-playground-projects';
const ASSETS_KEY = 'digital-publishing-playground-assets';

// --- FIRESTORE MIGRATION GUIDE ---
// This file uses localStorage for simplicity. To migrate to Firebase Firestore:
// 1. Initialize Firebase in a separate config file.
// 2. In each function, replace localStorage logic with the corresponding Firestore SDK call.
// 3. The functions are now `async` to reflect real-world database interactions.

const getInitialData = (): { projects: Project[], assets: Asset[] } => ({
  projects: [
    {
      id: 'proj-1',
      title: 'The Crimson Cipher',
      description: 'A sci-fi thriller set in neo-kyoto.',
      isPublished: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      chapters: [
        {
          id: 'chap-1',
          title: 'The Silent Signal',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          pages: [
            {
              id: 'page-1',
              title: 'First Encounter',
              content: 'The rain fell in sheets, blurring the neon signs into a watercolor mess. [[asset:asset-1:Kael]] adjusted his collar, the synthetic fabric doing little to ward off the chill. He was waiting for a ghost.',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          ],
        },
      ],
    },
  ],
  assets: [
      {
        id: 'asset-1',
        type: 'character',
        name: 'Kael',
        description: 'A grizzled cyber-detective haunted by his past.',
        data: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
  ]
});

export const initializeData = (): void => {
  // FIRESTORE_INTEGRATION: This function would be replaced by checking if the database is empty
  // and seeding it if necessary, perhaps with a Cloud Function.
  if (!localStorage.getItem(PROJECTS_KEY)) {
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(getInitialData().projects));
  }
  if (!localStorage.getItem(ASSETS_KEY)) {
    localStorage.setItem(ASSETS_KEY, JSON.stringify(getInitialData().assets));
  }
};

// --- Projects ---

export const getProjects = (): Project[] => {
  // FIRESTORE_INTEGRATION: Replace with:
  // const querySnapshot = await getDocs(collection(db, "projects"));
  // return querySnapshot.docs.map(doc => doc.data() as Project);
  const data = localStorage.getItem(PROJECTS_KEY);
  return data ? JSON.parse(data) : [];
};

export const saveProjects = (projects: Project[]): void => {
  // FIRESTORE_INTEGRATION: This would be replaced by individual `setDoc` or `updateDoc` calls
  // for each modified project within the application logic, rather than saving all projects at once.
  // For example: await setDoc(doc(db, "projects", projectId), projectData);
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
};

// --- Assets ---

export const getAssets = (): Asset[] => {
  // FIRESTORE_INTEGRATION: Replace with:
  // const querySnapshot = await getDocs(collection(db, "assets"));
  // return querySnapshot.docs.map(doc => doc.data() as Asset);
  const data = localStorage.getItem(ASSETS_KEY);
  return data ? JSON.parse(data) : [];
};

export const saveAssets = (assets: Asset[]): void => {
  // FIRESTORE_INTEGRATION: Replace with individual `setDoc` or `updateDoc` calls.
  // For example: await setDoc(doc(db, "assets", assetId), assetData);
  localStorage.setItem(ASSETS_KEY, JSON.stringify(assets));
};

// --- Generic Model Helpers ---

export const createNewProject = (title: string): Project => {
  return {
    id: crypto.randomUUID(),
    title,
    description: '',
    chapters: [],
    isPublished: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
};

export const createNewChapter = (title: string): Chapter => {
  return {
    id: crypto.randomUUID(),
    title,
    pages: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
};

export const createNewPage = (title: string): Page => {
  return {
    id: crypto.randomUUID(),
    title,
    content: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
};

export const createNewAsset = (name: string, type: AssetType): Asset => {
  return {
    id: crypto.randomUUID(),
    name,
    type,
    description: '',
    data: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}
