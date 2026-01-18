
import baseStyles from './base.module.css';
import sidebarStyles from './sidebar.module.css';
import controlsStyles from './controls.module.css';
import themeStyles from './theme.module.css';
import modelsStyles from './models.module.css';
import keybindingsStyles from './keybindings.module.css';


export const styles = {
  ...baseStyles,
  ...sidebarStyles,
  ...controlsStyles,
  ...themeStyles,
  ...modelsStyles,
  ...keybindingsStyles,
};

export default styles;


export { baseStyles, sidebarStyles, controlsStyles, themeStyles, modelsStyles, keybindingsStyles };
