import { useEffect, useState } from 'react';

interface KeyboardLayoutInfo {
  layout: string;
  language: string;
  isLatin: boolean;
}

export const useKeyboardLayout = () => {
  const [layoutInfo, setLayoutInfo] = useState<KeyboardLayoutInfo>({
    layout: 'unknown',
    language: 'unknown',
    isLatin: true
  });

  useEffect(() => {
    const detectKeyboardLayout = () => {
      try {
        // Get keyboard layout from navigator
        const language = navigator.language || 'en-US';
        const languages = navigator.languages || [language];
        
        // Detect if primary language is Latin-based
        const latinLanguages = [
          'en', 'es', 'fr', 'de', 'it', 'pt', 'nl', 'sv', 'no', 'da', 'fi', 
          'is', 'et', 'lv', 'lt', 'pl', 'cs', 'sk', 'hu', 'ro', 'bg', 'hr', 
          'sl', 'sr', 'mt', 'ga', 'cy', 'eu', 'ca', 'gl'
        ];
        
        const primaryLang = languages[0].toLowerCase().split('-')[0];
        const isLatin = latinLanguages.includes(primaryLang);
        
        // Try to get more specific layout info
        let layout = 'unknown';
        
        // Check for common Windows keyboard layouts
        if (navigator.platform.includes('Win')) {
          // On Windows, try to detect layout from system
          const testInput = document.createElement('input');
          testInput.style.position = 'absolute';
          testInput.style.left = '-9999px';
          document.body.appendChild(testInput);
          
          try {
            testInput.focus();
            
            // Create a keyboard event to test layout
            const keyEvent = new KeyboardEvent('keydown', {
              key: 'a',
              code: 'KeyA',
              keyCode: 65,
              which: 65,
              bubbles: true
            });
            
            testInput.dispatchEvent(keyEvent);
            
            // Check what character was produced
            setTimeout(() => {
              const value = testInput.value;
              if (value === 'a') {
                layout = 'latin';
              } else if (value === 'ф') {
                layout = 'cyrillic';
              } else if (value === 'α') {
                layout = 'greek';
              } else {
                layout = 'other';
              }
              
              document.body.removeChild(testInput);
              
              setLayoutInfo({
                layout,
                language: primaryLang,
                isLatin
              });
            }, 10);
            
          } catch (error) {
            document.body.removeChild(testInput);
            // Fallback to language-based detection
            layout = isLatin ? 'latin' : 'non-latin';
            setLayoutInfo({
              layout,
              language: primaryLang,
              isLatin
            });
          }
        } else {
          // Non-Windows platforms - use language-based detection
          layout = isLatin ? 'latin' : 'non-latin';
          setLayoutInfo({
            layout,
            language: primaryLang,
            isLatin
          });
        }
        
      } catch (error) {
        console.warn('Error detecting keyboard layout:', error);
        setLayoutInfo({
          layout: 'unknown',
          language: 'unknown',
          isLatin: true
        });
      }
    };

    // Initial detection
    detectKeyboardLayout();

    // Listen for keyboard layout changes (Windows)
    const handleLayoutChange = () => {
      setTimeout(detectKeyboardLayout, 100);
    };

    // On Windows, listen for layout change events
    if (navigator.platform.includes('Win')) {
      window.addEventListener('focus', handleLayoutChange);
      window.addEventListener('keydown', handleLayoutChange, { once: true });
    }

    return () => {
      if (navigator.platform.includes('Win')) {
        window.removeEventListener('focus', handleLayoutChange);
        window.removeEventListener('keydown', handleLayoutChange);
      }
    };
  }, []);

  return layoutInfo;
};
