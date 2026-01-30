
import React, { useState, useRef } from 'react';
import { ClassType, ActivityType, WarmUpRequest, WarmUpResult, FileAttachment } from './types';
import { generateWarmUp, generateSpeech, extractMetadata } from './services/geminiService';
import ClassSelector from './components/ClassSelector';

const App: React.FC = () => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<WarmUpResult | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<WarmUpRequest>({
    classType: ClassType.PASITOS,
    unit: '',
    activityType: 'written',
    vocabulary: '',
    learningTargets: '',
    lessonPlan: ''
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(',')[1];
      const mimeType = file.type || 'application/pdf';
      
      setFormData(prev => ({
        ...prev,
        attachment: {
          name: file.name,
          mimeType: mimeType,
          base64: base64
        }
      }));

      setIsAnalyzing(true);
      try {
        const metadata = await extractMetadata(base64, mimeType);
        setFormData(prev => ({
          ...prev,
          unit: metadata.unit || prev.unit,
          vocabulary: metadata.vocabulary || prev.vocabulary,
          learningTargets: metadata.learningTargets || prev.learningTargets
        }));
      } catch (error) {
        console.error("Analysis failed", error);
      } finally {
        setIsAnalyzing(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const removeFile = () => {
    setFormData({ ...formData, attachment: undefined });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleGenerate = async () => {
    if (!formData.unit) {
      alert("Please enter a unit name.");
      return;
    }
    setLoading(true);
    try {
      const res = await generateWarmUp(formData);
      setResult(res);
      setStep(3);
    } catch (error) {
      console.error(error);
      alert("Failed to generate warm-up. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handlePlayAudio = async () => {
    if (!result?.listeningScript) return;
    setIsPlaying(true);
    try {
      await generateSpeech(result.listeningScript);
    } catch (error) {
      alert("Speech generation failed.");
    } finally {
      setIsPlaying(false);
    }
  };

  const reset = () => {
    setStep(1);
    setResult(null);
    setFormData({
      ...formData,
      unit: '',
      vocabulary: '',
      learningTargets: '',
      lessonPlan: '',
      attachment: undefined
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-blue-200">
              M
            </div>
            <div>
              <h1 className="text-xl font-lexend font-bold text-slate-800">MaestroWarmup AI</h1>
              <p className="text-xs text-slate-500 font-medium">Smart daily exercises for your students</p>
            </div>
          </div>
          {step > 1 && (
            <button 
              onClick={reset}
              className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 256 256"><path d="M224,128a96,96,0,1,1-96-96A96,96,0,0,1,224,128Z" opacity="0.2"></path><path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Zm45.66-117.66a8,8,0,0,1,0,11.32l-32,32a8,8,0,0,1-11.32,0l-32-32a8,8,0,0,1,11.32-11.32L128,116.69l26.34-26.35A8,8,0,0,1,173.66,98.34Z"></path></svg>
              Start Over
            </button>
          )}
        </div>
      </header>

      <main className="flex-grow max-w-4xl mx-auto w-full px-4 py-8">
        {step === 1 && (
          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <section className="text-center space-y-3">
              <h2 className="text-3xl font-lexend font-bold text-slate-900">Which class are we preparing for?</h2>
              <p className="text-slate-600">Select the level to customize the exercise difficulty.</p>
            </section>
            
            <ClassSelector 
              selected={formData.classType} 
              onSelect={(type) => setFormData({ ...formData, classType: type })} 
            />

            <div className="flex justify-center">
              <button 
                onClick={() => setStep(2)}
                className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold shadow-xl shadow-blue-200 hover:bg-blue-700 hover:-translate-y-0.5 transition-all flex items-center gap-2"
              >
                Continue to Lesson Details
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 256 256"><path d="M221.66,133.66l-72,72a8,8,0,0,1-11.32-11.32L204.69,128,138.34,61.66a8,8,0,0,1,11.32-11.32l72,72A8,8,0,0,1,221.66,133.66Z"></path></svg>
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
            {/* Document Import Section */}
            <section className={`p-6 rounded-2xl shadow-lg transition-all duration-500 ${isAnalyzing ? 'bg-blue-500 animate-pulse' : 'bg-blue-600 shadow-blue-100'} text-white space-y-4`}>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-lg">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 256 256"><path d="M216,40H40A16,16,0,0,0,24,56V200a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V56A16,16,0,0,0,216,40Zm-8,160H48V56H208V200Zm-24-88a8,8,0,0,1-8,8H80a8,8,0,0,1,0-16h96A8,8,0,0,1,184,112Zm0,32a8,8,0,0,1-8,8H80a8,8,0,0,1,0-16h96A8,8,0,0,1,184,144Zm0,32a8,8,0,0,1-8,8H80a8,8,0,0,1,0-16h96A8,8,0,0,1,184,176Z"></path></svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold font-lexend">{isAnalyzing ? 'AI is scanning your document...' : 'Smart Document Import'}</h3>
                  <p className="text-sm text-blue-100 opacity-90">Upload a PDF/Text from Google Drive to auto-fill vocabulary and targets.</p>
                </div>
              </div>

              {!formData.attachment ? (
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-white/30 rounded-xl p-8 text-center hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <p className="text-sm font-medium">Click to upload or drag & drop</p>
                  <p className="text-xs text-blue-200 mt-1">Supports PDF and TXT files</p>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileChange} 
                    accept=".pdf,.txt" 
                    className="hidden" 
                  />
                </div>
              ) : (
                <div className="bg-white/10 rounded-xl p-4 flex items-center justify-between border border-white/20">
                  <div className="flex items-center gap-3">
                    {isAnalyzing ? (
                       <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8,0,0,1,8-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962,0,0,1,4 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    ) : (
                      <div className="bg-white text-blue-600 p-2 rounded-lg font-bold text-xs uppercase">
                        {formData.attachment.name.split('.').pop()}
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-bold truncate max-w-[200px]">{formData.attachment.name}</p>
                      <p className="text-xs text-blue-200">
                        {isAnalyzing ? 'Extracting details...' : 'Details extracted and pre-filled below'}
                      </p>
                    </div>
                  </div>
                  {!isAnalyzing && (
                    <button 
                      onClick={removeFile}
                      className="p-2 hover:bg-white/20 rounded-full transition-colors text-white"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 256 256"><path d="M216,48H176V40a24,24,0,0,0-24-24H104A24,24,0,0,0,80,40v8H40a8,8,0,0,0,0,16h8V208a16,16,0,0,0,16,16H192a16,16,0,0,0,16-16V64h8a8,8,0,0,0,0-16ZM96,40a8,8,0,0,1,8-8h48a8,8,0,0,1,8,8v8H96Zm96,168H64V64H192ZM112,104v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Zm48,0v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Z"></path></svg>
                    </button>
                  )}
                </div>
              )}
            </section>

            <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Current Unit</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Los Deportes, La Familia..."
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-600 outline-none transition-all"
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Activity Type</label>
                  <select 
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-600 outline-none transition-all"
                    value={formData.activityType}
                    onChange={(e) => setFormData({ ...formData, activityType: e.target.value as ActivityType })}
                  >
                    <option value="written">Written (Translation/Grammar)</option>
                    <option value="spoken">Spoken (Partner Discussion)</option>
                    <option value="listening">Listening (Comprehension)</option>
                    <option value="other">Other (Drawing/Game)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Vocabulary List</label>
                  <textarea 
                    placeholder="List the specific words for this lesson..."
                    className="w-full h-32 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-600 outline-none transition-all"
                    value={formData.vocabulary}
                    onChange={(e) => setFormData({ ...formData, vocabulary: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Learning Targets</label>
                    <textarea 
                      placeholder="What should they achieve?"
                      className="w-full h-24 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-600 outline-none transition-all"
                      value={formData.learningTargets}
                      onChange={(e) => setFormData({ ...formData, learningTargets: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Extra Lesson Details (Optional)</label>
                    <textarea 
                      placeholder="Any specific context for today?"
                      className="w-full h-24 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-600 outline-none transition-all"
                      value={formData.lessonPlan}
                      onChange={(e) => setFormData({ ...formData, lessonPlan: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-4 pt-4 border-t border-slate-100">
                <button 
                  onClick={() => setStep(1)}
                  className="px-6 py-3 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Back
                </button>
                <button 
                  onClick={handleGenerate}
                  disabled={loading || isAnalyzing}
                  className={`flex-grow bg-blue-600 text-white px-8 py-3 rounded-xl font-bold shadow-xl shadow-blue-200 transition-all flex items-center justify-center gap-2 ${(loading || isAnalyzing) ? 'opacity-70 cursor-not-allowed' : 'hover:bg-blue-700'}`}
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8,0,0,1,8-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962,0,0,1,4 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                      Creating Warm-up...
                    </>
                  ) : (
                    <>
                      Generate Warm-up
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 256 256"><path d="M128,128,80,176a8,8,0,0,1-11.32-11.32l40-40-40-40A8,8,0,0,1,80,72.68L128,120l48-47.32a8,8,0,1,1,11.32,11.32l-40,40,40,40a8,8,0,0,1-11.32,11.32Z"></path></svg>
                    </>
                  )}
                </button>
              </div>
            </section>
          </div>
        )}

        {step === 3 && result && (
          <div className="space-y-6 animate-in zoom-in-95 fade-in duration-500">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="bg-blue-600 p-6 text-white flex justify-between items-start">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-widest opacity-80 mb-1">Generated Warm-Up</h3>
                  <h2 className="text-2xl font-lexend font-bold">{result.title}</h2>
                </div>
                <div className="bg-white/20 px-3 py-1 rounded text-xs font-bold uppercase tracking-widest">
                  {formData.activityType}
                </div>
              </div>
              <div className="p-8 space-y-6">
                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                  <h4 className="text-blue-900 font-bold text-sm mb-1">Student Instructions:</h4>
                  <p className="text-blue-800 leading-relaxed">{result.instruction}</p>
                </div>

                <div className="prose prose-slate max-w-none">
                  <div className="whitespace-pre-wrap font-medium text-slate-700 bg-slate-50 p-6 rounded-xl border border-slate-100 shadow-inner">
                    {result.content}
                  </div>
                </div>

                {result.listeningScript && (
                  <div className="border-t border-slate-100 pt-6">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-bold text-slate-800 flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="#2563eb" viewBox="0 0 256 256"><path d="M155.51,24.81a8,8,0,0,0-8.42.88L77.25,80H32A16,16,0,0,0,16,96v64a16,16,0,0,0,16,16H77.25l69.84,54.31a8,8,0,0,0,4.91,1.69,8,8,0,0,0,3.51-.81A8,8,0,0,0,160,224V32A8,8,0,0,0,155.51,24.81ZM32,96H72v64H32ZM144,207.64,88,164.09V91.91l56-43.55Zm56-79.64a40,40,0,0,0-11.72-28.28,8,8,0,0,0-11.31,11.31A24,24,0,0,1,184,128a24,24,0,0,1-7,17,8,8,0,1,0,11.31,11.32A40,40,0,0,0,200,128Zm40,0a80,80,0,0,0-23.43-56.57,8,8,0,0,0-11.32,11.32,64,64,0,0,1,0,90.5a8,8,0,1,0,11.32,11.32A80,80,0,0,0,240,128Z"></path></svg>
                        Teacher Listening Script
                      </h4>
                      <button 
                        onClick={handlePlayAudio}
                        disabled={isPlaying}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-blue-700 disabled:opacity-50 transition-all shadow-md shadow-blue-100"
                      >
                        {isPlaying ? 'Speaking...' : 'Play Spanish Audio'}
                      </button>
                    </div>
                    <p className="text-slate-600 bg-slate-50 p-4 rounded-xl italic border border-slate-100 text-sm leading-relaxed">
                      {result.listeningScript}
                    </p>
                  </div>
                )}

                {result.teacherKey && (
                  <details className="group border-t border-slate-100 pt-6">
                    <summary className="font-bold text-slate-800 cursor-pointer flex items-center gap-2 hover:text-blue-600 transition-colors">
                      <svg className="group-open:rotate-180 transition-transform" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 256 256"><path d="M213.66,101.66l-80,80a8,8,0,0,1-11.32,0l-80-80a8,8,0,0,1,11.32-11.32L128,164.69l74.34-74.35a8,8,0,0,1,11.32,11.32Z"></path></svg>
                      Teacher Notes & Key
                    </summary>
                    <div className="mt-4 text-slate-600 bg-green-50 p-4 rounded-xl text-sm border border-green-100">
                      {result.teacherKey}
                    </div>
                  </details>
                )}
              </div>
            </div>

            <div className="flex gap-4">
              <button 
                onClick={() => setStep(2)}
                className="flex-1 px-6 py-4 bg-white border border-slate-200 rounded-xl font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
              >
                Modify Settings
              </button>
              <button 
                onClick={handleGenerate}
                disabled={loading}
                className="flex-1 px-6 py-4 bg-blue-600 text-white rounded-xl font-bold shadow-xl shadow-blue-200 hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                {loading ? 'Regenerating...' : 'Regenerate'}
              </button>
            </div>
          </div>
        )}
      </main>

      <footer className="bg-white border-t border-slate-200 py-8 mt-auto">
        <div className="max-w-4xl mx-auto px-4 text-center text-slate-400 text-xs font-medium space-y-2">
          <p>© {new Date().getFullYear()} MaestroWarmup AI — Built for language educators.</p>
          <p>Analyzing and generating with Gemini 3 Pro</p>
        </div>
      </footer>
    </div>
  );
};

export default App;
