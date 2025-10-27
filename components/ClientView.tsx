
import React, { useContext, useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AppContext } from '../App';
import type { Project, Chapter, Page, Asset } from '../types';

// --- Client View Components ---

export const ClientView: React.FC = () => {
    const { projects } = useContext(AppContext);
    const publishedProjects = projects.filter(p => p.isPublished);
  
    return (
      <div className="min-h-screen bg-gray-900 text-gray-200">
        <header className="bg-gray-800/50 backdrop-blur-sm sticky top-0 border-b border-gray-700">
            <nav className="container mx-auto px-6 py-4 flex justify-between items-center">
                <h1 className="text-2xl font-bold text-white">Published Works</h1>
                <Link to="/editor" className="text-sm bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded">
                  Editor Login
                </Link>
            </nav>
        </header>
        <main className="container mx-auto px-6 py-12">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {publishedProjects.length > 0 ? publishedProjects.map(project => (
                    <Link to={`/project/${project.id}`} key={project.id} className="block bg-gray-800 rounded-lg p-6 hover:bg-gray-700 transition duration-300 transform hover:-translate-y-1 shadow-lg">
                        <h2 className="text-xl font-bold text-white mb-2">{project.title}</h2>
                        <p className="text-gray-400">{project.description}</p>
                    </Link>
                )) : (
                    <div className="col-span-full text-center text-gray-400">
                        <p>No works have been published yet.</p>
                    </div>
                )}
            </div>
        </main>
      </div>
    );
};

const AssetPopover: React.FC<{ asset: Asset; onClose: () => void }> = ({ asset, onClose }) => (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50" onClick={onClose}>
        <div className="bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-2xl font-bold text-white mb-2">{asset.name}</h3>
            <p className="text-sm uppercase text-indigo-400 mb-4">{asset.type}</p>
            {asset.data.imageUrl && (
                <img src={asset.data.imageUrl} alt={asset.name} className="w-full h-48 object-cover rounded-md mb-4" />
            )}
            <p className="text-gray-300 whitespace-pre-wrap">{asset.description}</p>
            <button onClick={onClose} className="mt-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded w-full">Close</button>
        </div>
    </div>
);

const ContentRenderer: React.FC<{ content: string; onAssetClick: (assetId: string) => void }> = ({ content, onAssetClick }) => {
    const assetRegex = /\[\[asset:(.*?):(.*?)\]\]/g;
    const parts = content.split(assetRegex);

    return (
        <>
            {parts.map((part, index) => {
                // Every 3rd element is the asset ID, and the one after is the name
                if (index % 3 === 1) {
                    const assetId = part;
                    const assetName = parts[index + 1];
                    return (
                        <button 
                            key={index} 
                            onClick={() => onAssetClick(assetId)} 
                            className="text-indigo-400 font-semibold hover:underline bg-indigo-900/50 px-1 py-0.5 rounded"
                        >
                            {assetName}
                        </button>
                    );
                }
                // Skip the names, as they're handled with the IDs
                if (index % 3 === 2) {
                    return null;
                }
                // This is the plain text part
                return <span key={index}>{part}</span>;
            })}
        </>
    );
};


export const PublishedProjectView: React.FC = () => {
    const { projectId } = useParams<{ projectId: string }>();
    const { projects, assets } = useContext(AppContext);
    const [project, setProject] = useState<Project | null>(null);
    const [activePage, setActivePage] = useState<Page | null>(null);
    const [activeAsset, setActiveAsset] = useState<Asset | null>(null);

    useEffect(() => {
        const foundProject = projects.find(p => p.id === projectId && p.isPublished);
        if (foundProject) {
            setProject(foundProject);
            if(foundProject.chapters[0]?.pages[0]) {
                setActivePage(foundProject.chapters[0].pages[0]);
            }
        }
    }, [projectId, projects]);
    
    const handleAssetClick = (assetId: string) => {
        const foundAsset = assets.find(a => a.id === assetId);
        if (foundAsset) {
            setActiveAsset(foundAsset);
        }
    };

    if (!project) {
        return (
            <div className="flex items-center justify-center h-screen text-gray-400">
                <div className="text-center">
                    <p>Project not found or not published.</p>
                    <Link to="/" className="text-indigo-400 hover:underline mt-4 inline-block">Return to library</Link>
                </div>
            </div>
        );
    }

    return (
        <>
        {activeAsset && <AssetPopover asset={activeAsset} onClose={() => setActiveAsset(null)} />}
        <div className="flex h-screen bg-gray-900 text-gray-200">
            <aside className="w-1/4 min-w-[250px] max-w-[350px] bg-gray-800 p-6 overflow-y-auto border-r border-gray-700">
                <Link to="/" className="text-sm text-indigo-400 hover:underline mb-6 block">&larr; Back to Library</Link>
                <h1 className="text-2xl font-bold mb-2">{project.title}</h1>
                <p className="text-sm text-gray-400 mb-6">{project.description}</p>
                <nav>
                    {project.chapters.map(chapter => (
                        <div key={chapter.id} className="mb-4">
                            <h3 className="font-semibold text-lg text-gray-300 mb-2">{chapter.title}</h3>
                            <ul className="space-y-1 ml-2">
                                {chapter.pages.map(page => (
                                    <li key={page.id}>
                                        <button 
                                            onClick={() => setActivePage(page)}
                                            className={`w-full text-left p-2 rounded transition ${activePage?.id === page.id ? 'bg-indigo-600 text-white' : 'hover:bg-gray-700 text-gray-400'}`}
                                        >
                                            {page.title}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </nav>
            </aside>
            <main className="flex-grow p-8 md:p-12 overflow-y-auto">
                {activePage ? (
                    <article className="prose prose-invert prose-lg max-w-none mx-auto">
                        <h1 className="text-4xl font-bold mb-6">{activePage.title}</h1>
                        <div className="whitespace-pre-wrap leading-relaxed">
                            <ContentRenderer content={activePage.content} onAssetClick={handleAssetClick} />
                        </div>
                    </article>
                ) : (
                    <div className="flex items-center justify-center h-full">
                        <p className="text-gray-500">Select a page to start reading.</p>
                    </div>
                )}
            </main>
        </div>
        </>
    );
};
