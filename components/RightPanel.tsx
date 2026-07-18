
import React from 'react';
import { X, MessageSquare, Sliders, Info, Zap, KeyRound } from 'lucide-react';

interface RightPanelProps {
  isOpen: boolean;
  onCloseMobile?: () => void;

  textModels: string[];
  selectedTextModel: string;
  onSelectTextModel: (model: string) => void;
  
  enableStreaming: boolean;
  onToggleStreaming: () => void;

  systemInstruction: string;
  onSystemInstructionChange: (value: string) => void;

  apiKey: string;
  onApiKeyChange: (value: string) => void;
}

const RightPanelComponent: React.FC<RightPanelProps> = ({
  isOpen,
  onCloseMobile,
  textModels,
  selectedTextModel,
  onSelectTextModel,
  enableStreaming,
  onToggleStreaming,
  systemInstruction,
  onSystemInstructionChange,
  apiKey,
  onApiKeyChange
}) => {
  return (
    <aside className={`
      fixed inset-y-0 right-0 z-30 w-80 
      bg-latte-base border-l border-latte-surface0
      dark:bg-mocha-base dark:border-mocha-surface0
      transform transition-transform duration-300 ease-in-out
      ${isOpen ? 'translate-x-0' : 'translate-x-full'}
      md:relative md:translate-x-0
      ${!isOpen ? 'md:hidden' : 'md:flex'}
      flex flex-col shadow-2xl md:shadow-none
    `}>
      
      {/* Header */}
      <div className="p-4 border-b border-latte-surface0 dark:border-mocha-surface0 flex items-center justify-between">
        <div className="flex items-center gap-2 font-semibold text-latte-text dark:text-mocha-text">
          <Sliders size={18} />
          <span>Configuration</span>
        </div>
        <button 
          onClick={onCloseMobile}
          className="md:hidden p-1 hover:bg-latte-surface0 dark:hover:bg-mocha-surface0 rounded text-latte-subtext1 dark:text-mocha-overlay0"
        >
          <X size={20} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">

        {/* Pollinations Key */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-latte-subtext1 dark:text-mocha-overlay0" htmlFor="pollinations-key">
            <KeyRound size={12} />
            Pollinations Key
          </label>
          <input
            id="pollinations-key"
            type="password"
            value={apiKey}
            onChange={(event) => onApiKeyChange(event.target.value.trim())}
            placeholder="pk_..."
            autoComplete="off"
            className="w-full text-sm rounded-lg p-2.5 outline-none transition-all
              bg-latte-mantle border border-latte-surface0 text-latte-text focus:border-latte-blue
              dark:bg-mocha-surface0 dark:border-mocha-surface1 dark:text-mocha-text dark:focus:border-mocha-mauve"
          />
          <p className="text-[10px] text-latte-subtext1 dark:text-mocha-overlay0">
            Use a browser-safe <code>pk_</code> key from{' '}
            <a className="underline" href="https://enter.pollinations.ai" target="_blank" rel="noreferrer">enter.pollinations.ai</a>.
          </p>
        </div>

        <hr className="border-latte-surface0 dark:border-mocha-surface0 opacity-50" />
        
        {/* System Instruction */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-latte-subtext1 dark:text-mocha-overlay0">
            <Info size={12} />
            System Instruction
          </label>
          <textarea 
            value={systemInstruction}
            onChange={(e) => onSystemInstructionChange(e.target.value)}
            placeholder="You are a helpful AI assistant..."
            className="w-full h-40 p-3 text-sm rounded-lg outline-none resize-none transition-all
              bg-latte-mantle border border-latte-surface0 text-latte-text focus:border-latte-blue
              dark:bg-mocha-surface0 dark:border-mocha-surface1 dark:text-mocha-text dark:focus:border-mocha-mauve"
          />
          <p className="text-[10px] text-latte-subtext1 dark:text-mocha-overlay0">
            Define how the AI should behave for this chat session.
          </p>
        </div>

        <hr className="border-latte-surface0 dark:border-mocha-surface0 opacity-50" />

        {/* Text Model Selector */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-latte-subtext1 dark:text-mocha-overlay0">
            <MessageSquare size={12} />
            Text Model
          </label>
          <select 
            value={selectedTextModel}
            onChange={(e) => onSelectTextModel(e.target.value)}
            className="w-full text-sm rounded-lg p-2.5 outline-none transition-all cursor-pointer
              bg-latte-mantle border border-latte-surface0 text-latte-text focus:border-latte-blue
              dark:bg-mocha-surface0 dark:border-mocha-surface1 dark:text-mocha-text dark:focus:border-mocha-mauve"
          >
            {textModels.map(model => (
              <option key={model} value={model}>{model}</option>
            ))}
          </select>
          <p className="text-[10px] text-latte-subtext1 dark:text-mocha-overlay0">
            Specific to this chat session.
          </p>
        </div>

        <hr className="border-latte-surface0 dark:border-mocha-surface0 opacity-50" />

        {/* Streaming Toggle */}
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-latte-subtext1 dark:text-mocha-overlay0 cursor-pointer" onClick={onToggleStreaming}>
            <Zap size={12} />
            Stream Responses
          </label>
          <button
            onClick={onToggleStreaming}
            className={`w-10 h-6 rounded-full p-1 transition-colors duration-200 ease-in-out relative focus:outline-none
              ${enableStreaming ? 'bg-latte-green dark:bg-mocha-green' : 'bg-latte-surface1 dark:bg-mocha-surface1'}
            `}
          >
            <div className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform duration-200
              ${enableStreaming ? 'translate-x-4' : 'translate-x-0'}
            `} />
          </button>
        </div>

      </div>
    </aside>
  );
};

export const RightPanel = React.memo(RightPanelComponent);
