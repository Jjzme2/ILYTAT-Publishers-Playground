
import React, { useState, useContext, useEffect, useCallback, useMemo, useRef } from 'react';
import { AppContext } from '../App';
import type { Project, Chapter, Page, Asset, AssetType } from '../types';
import { saveProjects, saveAssets, createNewProject, createNewChapter, createNewPage, createNewAsset } from '../services/storageService';
import { getInLineEdit } from '../services/geminiService';
import { useDebounce } from '../hooks/useDebounce';
import { AiFeaturesPanel } from './AiFeatures';
import { Link } from 'react-router-dom';

// --- Helper Functions & Sub-components ---

const useProjectStructure = () => {
  const { projects, setProjects } = useContext(AppContext);

  const updateProjects = (updatedProjects: Project[]) => {
    setProjects(updatedProjects);
    saveProjects(updatedProjects);
  };
  
  const findItem = useCallback((id: string) => {
    for (const project of projects) {
      if (project.id === id) return { project };
      for (const chapter of project.chapters) {
        if (chapter.id === id) return { project, chapter };
        for (const page of chapter.pages) {
          if (page.id === id) return { project, chapter, page };
        }
      }
    }
    return {};
  }, [projects]);

  const updateItem = (id: string, newValues: Partial<Project | Chapter | Page>) => {
    const newProjects = projects.map(p => {
        if(p.id === id && 'title' in newValues) return {...p, ...newValues, updatedAt: new Date().toISOString()};
        const newChapters = p.chapters.map(c => {
            if(c.id === id && 'title' in newValues) return {...c, ...newValues, updatedAt: new Date().toISOString()};
            const newPages = c.pages.map(pg => {
                if(pg.id === id) return {...pg, ...newValues, updatedAt: new Date().toISOString()};
                return pg;
            });
            return {...c, pages: newPages};
        });
        return {...p, chapters: newChapters};
    });
    updateProjects(newProjects);
  };

  return { projects, updateProjects, findItem, updateItem };
};

const ProjectTree: React.FC<{
  selectedId: string | null;
  onSelect: (id: string, type: 'project'|'chapter'|'page') => void;
}> = ({ selectedId, onSelect }) => {
    const { projects, updateProjects } = useProjectStructure();
    const { addToast } = useContext(AppContext);

    const handleAddProject = () => {
        const title = prompt("New project title:");
        if (title) {
            updateProjects([...projects, createNewProject(title)]);
            addToast(`Project "${title}" created`, 'success');
        }
    };

    const handleAddChapter = (projectId: string) => {
        const title = prompt("New chapter title:");
        if (title) {
            const newProjects = projects.map(p => {
                if (p.id === projectId) {
                    return { ...p, chapters: [...p.chapters, createNewChapter(title)] };
                }
                return p;
            });
            updateProjects(newProjects);
        }
    };
    
    const handleAddPage = (projectId: string, chapterId: string) => {
        const title = prompt("New page title:");
        if(title) {
            const newProjects = projects.map(p => {
                if(p.id === projectId) {
                    const newChapters = p.chapters.map(c => {
                        if(c.id === chapterId) {
                            return {...c, pages: [...c.pages, createNewPage(title)]};
                        }
                        return c;
                    });
                    return {...p, chapters: newChapters};
                }
                return p;
            });
            updateProjects(newProjects);
        }
    };
    
    return (
        <div className="bg-gray-800 p-4 h-full overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Projects</h2>
                <button onClick={handleAddProject} className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-1 px-2 rounded">+</button>
            </div>
            {projects.map(project => (
                <div key={project.id} className="mb-4">
                    <div onClick={() => onSelect(project.id, 'project')} className={`cursor-pointer p-2 rounded ${selectedId === project.id ? 'bg-indigo-500' : 'hover:bg-gray-700'}`}>
                        <div className="flex justify-between items-center">
                           <span className="font-semibold">{project.title}</span>
                           <button onClick={(e) => { e.stopPropagation(); handleAddChapter(project.id);}} className="text-xs bg-gray-600 hover:bg-gray-500 py-1 px-2 rounded">+</button>
                        </div>
                    </div>
                    <div className="ml-4 mt-2 space-y-2 border-l-2 border-gray-700 pl-4">
                        {project.chapters.map(chapter => (
                             <div key={chapter.id}>
                                 <div onClick={() => onSelect(chapter.id, 'chapter')} className={`cursor-pointer p-2 rounded ${selectedId === chapter.id ? 'bg-indigo-500' : 'hover:bg-gray-700'}`}>
                                    <div className="flex justify-between items-center">
                                       <span>{chapter.title}</span>
                                       <button onClick={(e) => { e.stopPropagation(); handleAddPage(project.id, chapter.id); }} className="text-xs bg-gray-600 hover:bg-gray-500 py-1 px-2 rounded">+</button>
                                    </div>
                                 </div>
                                 <div className="ml-4 mt-2 space-y-1 border-l-2 border-gray-600 pl-4">
                                    {chapter.pages.map(page => (
                                        <div key={page.id} onClick={() => onSelect(page.id, 'page')} className={`cursor-pointer p-2 rounded truncate ${selectedId === page.id ? 'bg-indigo-500' : 'hover:bg-gray-700'}`}>
                                            {page.title}
                                        </div>
                                    ))}
                                 </div>
                             </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
};

interface Selection {
    text: string;
    start: number;
    end: number;
}

const InlineAiToolbar: React.FC<{
    onAction: (action: 'improve' | 'expand' | 'summarize') => void;
}> = ({ onAction }) => (
    <div className="absolute top-0 left-1/2 -translate-x-1/2 -mt-12 bg-gray-900 border border-gray-700 rounded-md shadow-lg p-1 flex space-x-1 z-10">
        <button onClick={() => onAction('improve')} className="px-3 py-1 text-sm rounded hover:bg-indigo-600">Improve</button>
        <button onClick={() => onAction('expand')} className="px-3 py-1 text-sm rounded hover:bg-indigo-600">Expand</button>
        <button onClick={() => onAction('summarize')} className="px-3 py-1 text-sm rounded hover:bg-indigo-600">Summarize</button>
    </div>
);

const EditorPanel: React.FC<{ selectedId: string | null; }> = ({ selectedId }) => {
    const { findItem, updateItem } = useProjectStructure();
    const { addToast } = useContext(AppContext);
    const [currentItem, setCurrentItem] = useState<Project | Chapter | Page | null>(null);
    const [content, setContent] = useState('');
    const debouncedContent = useDebounce(content, 1500);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'unsaved' | 'saving' | 'saved'>('idle');
    const [selection, setSelection] = useState<Selection | null>(null);
    const [isAiLoading, setIsAiLoading] = useState(false);
    const editorRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if(selectedId) {
            const { project, chapter, page } = findItem(selectedId);
            const item = page || chapter || project || null;
            setCurrentItem(item);
            setContent((item && 'content' in item) ? (item as Page).content : '');
            setSaveStatus('idle');
            setSelection(null);
        } else {
            setCurrentItem(null);
            setContent('');
        }
    }, [selectedId, findItem]);

    useEffect(() => {
        if (saveStatus === 'unsaved') {
            setSaveStatus('saving');
        }
    }, [debouncedContent, saveStatus]);
    
    useEffect(() => {
      if (saveStatus === 'saving') {
        if(currentItem && 'content' in currentItem && debouncedContent !== currentItem.content) {
          updateItem(currentItem.id, { content: debouncedContent });
        }
        setSaveStatus('saved');
      }
    }, [saveStatus, currentItem, debouncedContent, updateItem]);

    useEffect(() => {
      if(saveStatus === 'saved') {
        const timer = setTimeout(() => setSaveStatus('idle'), 2000);
        return () => clearTimeout(timer);
      }
    }, [saveStatus]);

    const handleContentChange = (newContent: string) => {
        setContent(newContent);
        setSaveStatus('unsaved');
    }
    
    const handleTitleChange = (newTitle: string) => {
        if (currentItem) {
            updateItem(currentItem.id, { title: newTitle });
            setCurrentItem(prev => prev ? {...prev, title: newTitle} : null);
        }
    };
    
    const handleSelect = () => {
        const editor = editorRef.current;
        if (!editor) return;
        const { selectionStart, selectionEnd, value } = editor;
        if (selectionStart !== selectionEnd) {
            setSelection({ text: value.substring(selectionStart, selectionEnd), start: selectionStart, end: selectionEnd });
        } else {
            setSelection(null);
        }
    };
    
    const handleAiAction = async (action: 'improve' | 'expand' | 'summarize') => {
        if (!selection || isAiLoading) return;
        setIsAiLoading(true);
        try {
            const newText = await getInLineEdit(selection.text, action);
            const newContent = content.slice(0, selection.start) + newText + content.slice(selection.end);
            handleContentChange(newContent);
            addToast(`Text has been ${action}d.`, 'success');
        } catch (e) {
            addToast(`AI action failed: ${(e as Error).message}`, 'error');
        } finally {
            setIsAiLoading(false);
            setSelection(null);
        }
    };
    
    if (!currentItem) {
        return <div className="flex items-center justify-center h-full text-gray-400">Select an item to edit</div>;
    }
    
    const getSaveStatusText = () => {
        switch(saveStatus) {
            case 'unsaved': return 'Unsaved changes...';
            case 'saving': return 'Saving...';
            case 'saved': return 'All changes saved.';
            default: return `Last updated: ${new Date(currentItem.updatedAt).toLocaleTimeString()}`;
        }
    };

    return (
        <div className="p-6 h-full flex flex-col">
            <input 
                type="text" 
                value={currentItem.title}
                onChange={(e) => handleTitleChange(e.target.value)}
                className="bg-transparent text-3xl font-bold w-full mb-4 focus:outline-none focus:ring-1 focus:ring-indigo-500 rounded px-2 py-1"
            />
            <div className="flex-grow flex flex-col relative">
                {'content' in currentItem ? (
                    <>
                        {selection && !isAiLoading && <InlineAiToolbar onAction={handleAiAction} />}
                        {isAiLoading && <div className="absolute top-0 left-1/2 -translate-x-1/2 -mt-12 bg-gray-900 border border-gray-700 rounded-md shadow-lg p-2 z-10 text-sm">Generating...</div>}
                        <textarea 
                            ref={editorRef}
                            value={content}
                            onChange={(e) => handleContentChange(e.target.value)}
                            onSelect={handleSelect}
                            className="flex-grow bg-gray-800 w-full p-4 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none leading-relaxed"
                            placeholder="Start writing..."
                        />
                    </>
                ) : 'description' in currentItem ? (
                    <textarea 
                        value={(currentItem as Project).description}
                        onChange={(e) => updateItem(currentItem.id, { description: e.target.value })}
                        className="h-32 bg-gray-800 w-full p-4 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                        placeholder="Project description..."
                    />
                ) : null}
                <div className="text-right text-xs text-gray-400 pt-2 pr-2">
                   {getSaveStatusText()}
                </div>
            </div>
        </div>
    );
};

const AssetList: React.FC<{ onInsert: (assetId: string, name: string) => void }> = ({ onInsert }) => {
    const { assets, setAssets, addToast } = useContext(AppContext);
    
    const handleAddAsset = () => {
        const name = prompt("New asset name:");
        const type = prompt("Type (character, location, item, image):") as AssetType | null;
        if(name && type && ['character', 'location', 'item', 'image'].includes(type)) {
            const newAssets = [...assets, createNewAsset(name, type)];
            setAssets(newAssets);
            saveAssets(newAssets);
            addToast(`Asset "${name}" created.`, 'success');
        } else if (name || type) {
            addToast("Invalid asset name or type.", 'error');
        }
    };
    
    return (
         <div>
             <div className="flex justify-between items-center mb-4">
                 <h3 className="font-bold text-lg">Asset Library</h3>
                 <button onClick={handleAddAsset} className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-1 px-2 rounded">+</button>
             </div>
             <div className="space-y-2 max-h-64 overflow-y-auto">
                {assets.map(asset => (
                    <div key={asset.id} className="bg-gray-700 p-2 rounded flex justify-between items-center">
                        <div>
                            <p className="font-semibold">{asset.name}</p>
                            <p className="text-xs text-gray-400">{asset.type}</p>
                        </div>
                        <button onClick={() => onInsert(asset.id, asset.name)} className="text-xs bg-gray-600 hover:bg-gray-500 py-1 px-2 rounded">Insert</button>
                    </div>
                ))}
             </div>
        </div>
    );
}

// --- Main Editor View ---

export const EditorView: React.FC = () => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'ai' | 'assets'>('ai');

  const handleSelect = (id: string, type: 'project'|'chapter'|'page') => {
    setSelectedId(id);
  };
  
  return (
    <div className="h-screen w-screen flex flex-col">
      <header className="bg-gray-800 p-2 flex justify-between items-center border-b border-gray-700">
          <h1 className="text-xl font-bold">Digital Publishing Studio</h1>
          <Link to="/" className="text-sm bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-1 px-3 rounded">
            View Public Portal
          </Link>
      </header>
      <div className="flex-grow flex overflow-hidden">
        <aside className="w-1/4 min-w-[250px] max-w-[400px] border-r border-gray-700">
          <ProjectTree selectedId={selectedId} onSelect={handleSelect} />
        </aside>
        <main className="flex-grow">
          <EditorPanel selectedId={selectedId}/>
        </main>
        <aside className="w-1/3 min-w-[300px] max-w-[500px] border-l border-gray-700 bg-gray-800 p-4 flex flex-col">
            <div className="flex mb-4 border-b border-gray-700">
                <button onClick={() => setActiveTab('ai')} className={`py-2 px-4 font-semibold ${activeTab === 'ai' ? 'border-b-2 border-indigo-500 text-white' : 'text-gray-400'}`}>AI Tools</button>
                <button onClick={() => setActiveTab('assets')} className={`py-2 px-4 font-semibold ${activeTab === 'assets' ? 'border-b-2 border-indigo-500 text-white' : 'text-gray-400'}`}>Assets</button>
            </div>
            <div className="flex-grow overflow-y-auto">
                {activeTab === 'ai' && <AiFeaturesPanel />}
                {activeTab === 'assets' && <AssetList onInsert={(id, name) => alert(`This would insert [[asset:${id}:${name}]] into the editor.`)} />}
            </div>
        </aside>
      </div>
    </div>
  );
};
