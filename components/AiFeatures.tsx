import React, { useState, useCallback, useRef, useEffect, useContext } from 'react';
import * as geminiService from '../services/geminiService';
// Fix: Replaced 'LiveSession' with 'LiveConnection' and imported 'Modality' for use in LiveConversation component.
import { Modality } from '@google/genai';
import type { LiveServerMessage, LiveConnection } from '@google/genai';
import { AppContext } from '../App';
import { saveAssets } from '../services/storageService';

const LoadingSpinner: React.FC = () => (
  <div className="flex justify-center items-center p-4">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-400"></div>
  </div>
);

// --- Individual AI Feature Components ---

const WritingAssistant: React.FC = () => {
    const [prompt, setPrompt] = useState('');
    const [mode, setMode] = useState<'fast' | 'complex' | 'research'>('fast');
    const [result, setResult] = useState('');
    const [sources, setSources] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setResult('');
        setSources([]);
        try {
            if (mode === 'fast') {
                setResult(await geminiService.generateText(prompt, 'gemini-2.5-flash'));
            } else if (mode === 'complex') {
                setResult(await geminiService.generateWithThinking(prompt));
            } else if (mode === 'research') {
                const { text, sources } = await geminiService.generateWithSearch(prompt);
                setResult(text);
                setSources(sources);
            }
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
        <div className="bg-gray-700 p-4 rounded-lg mb-4">
            <h4 className="font-bold mb-2">Writing Assistant</h4>
            <div className="flex space-x-2 mb-2">
                <button onClick={() => setMode('fast')} className={`px-3 py-1 text-sm rounded ${mode === 'fast' ? 'bg-indigo-600' : 'bg-gray-600'}`}>Fast</button>
                <button onClick={() => setMode('complex')} className={`px-3 py-1 text-sm rounded ${mode === 'complex' ? 'bg-indigo-600' : 'bg-gray-600'}`}>Complex</button>
                <button onClick={() => setMode('research')} className={`px-3 py-1 text-sm rounded ${mode === 'research' ? 'bg-indigo-600' : 'bg-gray-600'}`}>Research</button>
            </div>
            <form onSubmit={handleSubmit}>
                <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    className="w-full bg-gray-800 p-2 rounded h-24 resize-none mb-2"
                    placeholder={`Enter prompt for ${mode} mode...`}
                />
                <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 py-2 rounded" disabled={isLoading}>Generate</button>
            </form>
            {isLoading && <LoadingSpinner />}
            {result && (
                <div className="mt-4 bg-gray-800 p-3 rounded max-h-48 overflow-y-auto">
                    <p className="whitespace-pre-wrap text-sm">{result}</p>
                    {sources.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-gray-700">
                            <h5 className="text-xs font-semibold mb-1">Sources:</h5>
                            <ul className="list-disc list-inside text-xs space-y-1">
                                {sources.map((source, i) => (
                                    <li key={i}><a href={source.web?.uri} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">{source.web?.title}</a></li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

const ImageAnalyzer: React.FC = () => {
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [prompt, setPrompt] = useState('Describe this image for an asset library.');
    const [result, setResult] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { addToast } = useContext(AppContext);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            const f = e.target.files[0];
            setFile(f);
            const reader = new FileReader();
            reader.onloadend = () => setPreview(reader.result as string);
            reader.readAsDataURL(f);
        }
    };
    
    const handleSubmit = async () => {
        if (!file || !prompt) return;
        setIsLoading(true);
        setResult('');
        try {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onloadend = async () => {
                const base64String = (reader.result as string).split(',')[1];
                const response = await geminiService.analyzeImage(prompt, base64String, file.type);
                setResult(response);
                setIsLoading(false);
            };
        } catch (e) {
            addToast(`Image analysis failed: ${(e as Error).message}`, 'error');
            setIsLoading(false);
        }
    };

    return (
        <div className="bg-gray-700 p-4 rounded-lg mb-4">
            <h4 className="font-bold mb-2">Image Analyzer</h4>
            <input type="file" accept="image/*" onChange={handleFileChange} className="text-sm mb-2 w-full" />
            {preview && <img src={preview} alt="preview" className="w-full h-32 object-cover rounded mb-2" />}
            <textarea value={prompt} onChange={e => setPrompt(e.target.value)} className="w-full bg-gray-800 p-2 rounded h-20 resize-none mb-2" />
            <button onClick={handleSubmit} disabled={isLoading || !file} className="w-full bg-indigo-600 hover:bg-indigo-700 py-2 rounded disabled:bg-gray-500">Analyze</button>
            {isLoading && <LoadingSpinner />}
            {result && <div className="mt-4 bg-gray-800 p-3 rounded max-h-48 overflow-y-auto text-sm"><p>{result}</p></div>}
        </div>
    );
};

const ImageGenerator: React.FC = () => {
    const { assets, setAssets, addToast } = useContext(AppContext);
    const [prompt, setPrompt] = useState('');
    const [aspectRatio, setAspectRatio] = useState('1:1');
    const [image, setImage] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async () => {
        if (!prompt) return;
        setIsLoading(true);
        setImage(null);
        const base64Bytes = await geminiService.generateImage(prompt, aspectRatio);
        if (base64Bytes) {
            setImage(`data:image/jpeg;base64,${base64Bytes}`);
        } else {
            addToast('Error generating image. Please check console for details.', 'error');
        }
        setIsLoading(false);
    };
    
    const saveToAssets = () => {
        if (!image) return;
        const newAsset = {
            id: crypto.randomUUID(),
            type: 'image' as const,
            name: prompt.substring(0, 30) || 'Generated Image',
            description: prompt,
            data: { imageUrl: image },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        const newAssets = [...assets, newAsset];
        setAssets(newAssets);
        saveAssets(newAssets);
        addToast('Image saved to Asset Library!', 'success');
    };

    return (
        <div className="bg-gray-700 p-4 rounded-lg mb-4">
            <h4 className="font-bold mb-2">Image Generator</h4>
            <div className="flex gap-2 mb-2">
                <input type="text" value={prompt} onChange={e => setPrompt(e.target.value)} className="w-full bg-gray-800 p-2 rounded" placeholder="A synthwave cat..." />
                <select value={aspectRatio} onChange={e => setAspectRatio(e.target.value)} className="bg-gray-800 p-2 rounded">
                    {["1:1", "3:4", "4:3", "9:16", "16:9"].map(r => <option key={r} value={r}>{r}</option>)}
                </select>
            </div>
            <button onClick={handleSubmit} disabled={isLoading} className="w-full bg-indigo-600 hover:bg-indigo-700 py-2 rounded">Generate</button>
            {isLoading && <LoadingSpinner />}
            {image && (
                <div className="mt-4">
                    <img src={image} alt={prompt} className="w-full rounded" />
                    <button onClick={saveToAssets} className="w-full bg-green-600 hover:bg-green-700 py-2 rounded mt-2">Save to Assets</button>
                </div>
            )}
        </div>
    );
};


const TextToSpeech: React.FC = () => {
    const [text, setText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const audioContextRef = useRef<AudioContext | null>(null);
    const { addToast } = useContext(AppContext);

    const handlePlay = async () => {
        if (!text) return;
        setIsLoading(true);
        const audioData = await geminiService.generateSpeech(text);
        setIsLoading(false);
        if (audioData) {
            try {
                if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
                    audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
                }
                const audioContext = audioContextRef.current;
                const decodedBytes = geminiService.decode(audioData);
                const audioBuffer = await geminiService.decodeAudioData(decodedBytes, audioContext, 24000, 1);
                const source = audioContext.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(audioContext.destination);
                source.start();
            } catch (e) {
                addToast(`Error playing audio: ${(e as Error).message}`, 'error');
            }
        } else {
            addToast('Failed to generate speech.', 'error');
        }
    };
    
    return (
        <div className="bg-gray-700 p-4 rounded-lg mb-4">
            <h4 className="font-bold mb-2">Text-to-Speech</h4>
            <textarea value={text} onChange={e => setText(e.target.value)} className="w-full bg-gray-800 p-2 rounded h-20 resize-none mb-2" placeholder="Text to read aloud..."/>
            <button onClick={handlePlay} disabled={isLoading || !text} className="w-full bg-indigo-600 hover:bg-indigo-700 py-2 rounded">Read Aloud</button>
            {isLoading && <LoadingSpinner />}
        </div>
    );
};


const LiveConversation: React.FC = () => {
    const [isSessionActive, setIsSessionActive] = useState(false);
    const [status, setStatus] = useState('Not connected');
    const [transcription, setTranscription] = useState<{user: string, model: string}[]>([]);
    // Fix: Replaced 'LiveSession' with the correct 'LiveConnection' type.
    const sessionRef = useRef<LiveConnection | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);

    const stopSession = useCallback(() => {
        if (sessionRef.current) {
            sessionRef.current.close();
            sessionRef.current = null;
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        if(scriptProcessorRef.current) {
            scriptProcessorRef.current.disconnect();
            scriptProcessorRef.current = null;
        }
        if (audioContextRef.current) {
            audioContextRef.current.close();
            audioContextRef.current = null;
        }
        setIsSessionActive(false);
        setStatus('Disconnected');
    }, []);

    const startSession = async () => {
        if (isSessionActive) return;
        setStatus('Connecting...');
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;
            
            const ai = geminiService.getAiInstance();

            let currentInputTranscription = '';
            let currentOutputTranscription = '';
            let nextStartTime = 0;
            const outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 24000});

            const sessionPromise = ai.live.connect({
                model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                callbacks: {
                    onopen: () => {
                        setStatus('Connected. Start speaking.');
                        setIsSessionActive(true);

                        const inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 16000});
                        audioContextRef.current = inputAudioContext;
                        
                        const source = inputAudioContext.createMediaStreamSource(stream);
                        const scriptProcessor = inputAudioContext.createScriptProcessor(4096, 1, 1);
                        scriptProcessorRef.current = scriptProcessor;

                        scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
                            const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                            const l = inputData.length;
                            const int16 = new Int16Array(l);
                            for (let i = 0; i < l; i++) {
                                int16[i] = inputData[i] * 32768;
                            }
                            const pcmBlob = {
                                data: geminiService.encode(new Uint8Array(int16.buffer)),
                                mimeType: 'audio/pcm;rate=16000',
                            };
                            sessionPromise.then((session) => {
                                session.sendRealtimeInput({ media: pcmBlob });
                            });
                        };
                        source.connect(scriptProcessor);
                        scriptProcessor.connect(inputAudioContext.destination);
                    },
                    onmessage: async (message: LiveServerMessage) => {
                        if (message.serverContent?.inputTranscription) {
                            currentInputTranscription += message.serverContent.inputTranscription.text;
                        }
                        if (message.serverContent?.outputTranscription) {
                            currentOutputTranscription += message.serverContent.outputTranscription.text;
                        }

                        if(message.serverContent?.turnComplete) {
                            setTranscription(prev => [...prev, {user: currentInputTranscription, model: currentOutputTranscription}]);
                            currentInputTranscription = '';
                            currentOutputTranscription = '';
                        }

                        const audioData = message.serverContent?.modelTurn?.parts[0]?.inlineData.data;
                        if(audioData) {
                             nextStartTime = Math.max(nextStartTime, outputAudioContext.currentTime);
                             const audioBuffer = await geminiService.decodeAudioData(geminiService.decode(audioData), outputAudioContext, 24000, 1);
                             const source = outputAudioContext.createBufferSource();
                             source.buffer = audioBuffer;
                             source.connect(outputAudioContext.destination);
                             source.start(nextStartTime);
                             nextStartTime += audioBuffer.duration;
                        }
                    },
                    onerror: (e: ErrorEvent) => {
                        console.error('Live session error:', e);
                        setStatus(`Error: ${e.message}`);
                        stopSession();
                    },
                    onclose: () => {
                        setStatus('Session closed.');
                        setIsSessionActive(false);
                    },
                },
                config: {
                    // Fix: Use Modality enum instead of string literal 'AUDIO'.
                    responseModalities: [Modality.AUDIO],
                    inputAudioTranscription: {},
                    outputAudioTranscription: {},
                }
            });
            sessionRef.current = await sessionPromise;
        } catch (err) {
            setStatus(`Failed to start: ${(err as Error).message}`);
            console.error(err);
        }
    };
    
    return (
        <div className="bg-gray-700 p-4 rounded-lg">
            <h4 className="font-bold mb-2">Live Conversation</h4>
            <div className="flex gap-2 mb-2">
                <button onClick={startSession} disabled={isSessionActive} className="flex-1 bg-green-600 hover:bg-green-700 py-2 rounded disabled:bg-gray-500">Start</button>
                <button onClick={stopSession} disabled={!isSessionActive} className="flex-1 bg-red-600 hover:bg-red-700 py-2 rounded disabled:bg-gray-500">Stop</button>
            </div>
            <p className="text-sm text-center text-gray-400 mb-2">Status: {status}</p>
            <div className="bg-gray-800 p-2 rounded h-48 overflow-y-auto text-sm space-y-2">
                {transcription.map((turn, i) => (
                    <div key={i}>
                        <p><span className="font-semibold text-indigo-400">You:</span> {turn.user}</p>
                        <p><span className="font-semibold text-green-400">AI:</span> {turn.model}</p>
                    </div>
                ))}
            </div>
        </div>
    );
};

// --- Main Panel Component ---

export const AiFeaturesPanel: React.FC = () => {
    return (
        <div className="space-y-4">
            <WritingAssistant />
            <ImageAnalyzer />
            <ImageGenerator />
            <TextToSpeech />
            <LiveConversation />
        </div>
    );
};