// Settings Pane - Combined Styles
import baseStyles from './base.module.css';
import sidebarStyles from './sidebar.module.css';
import controlsStyles from './controls.module.css';
import themeStyles from './theme.module.css';
import modelsStyles from './models.module.css';
import keybindingsStyles from './keybindings.module.css';

// Merge all styles into a single object
export const styles = {
  ...baseStyles,
  ...sidebarStyles,
  ...controlsStyles,
  ...themeStyles,
  ...modelsStyles,
  ...keybindingsStyles,
};

export default styles;

// Export individual modules for selective imports
export { baseStyles, sidebarStyles, controlsStyles, themeStyles, modelsStyles, keybindingsStyles };
