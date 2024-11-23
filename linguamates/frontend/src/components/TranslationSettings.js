import React from 'react';
import { Globe } from 'lucide-react';

const TranslationSettings = ({ 
  languages, 
  fromLanguage, 
  toLanguage, 
  setFromLanguage, 
  setToLanguage, 
  isTranslating, 
  setIsTranslating 
}) => (
  <div className="absolute top-4 right-4 flex items-center space-x-2 bg-black bg-opacity-50 p-2 rounded z-10">
    <select
      value={fromLanguage}
      onChange={(e) => setFromLanguage(e.target.value)}
      className="bg-gray-800 text-white rounded px-2 py-1 text-sm"
    >
      <option value="">Source Language</option>
      {languages.map(lang => (
        <option key={lang.code} value={lang.code}>
          {lang.name}
        </option>
      ))}
    </select>

    <Globe className="w-4 h-4 text-white" />

    <select
      value={toLanguage}
      onChange={(e) => setToLanguage(e.target.value)}
      className="bg-gray-800 text-white rounded px-2 py-1 text-sm"
    >
      <option value="">Target Language</option>
      {languages.map(lang => (
        <option key={lang.code} value={lang.code}>
          {lang.name}
        </option>
      ))}
    </select>

    <button
      onClick={() => setIsTranslating(!isTranslating)}
      className={`px-3 py-1 rounded text-sm ${
        isTranslating 
          ? 'bg-green-500 hover:bg-green-600' 
          : 'bg-gray-600 hover:bg-gray-700'
      } text-white transition-colors`}
    >
      {isTranslating ? 'Translating...' : 'Start Translation'}
    </button>
  </div>
);

export default TranslationSettings;