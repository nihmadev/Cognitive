import panelStyles from './panel.module.css';
import headerStyles from './header.module.css';
import dropdownStyles from './dropdown.module.css';
import problemsStyles from './problems.module.css';
import placeholderStyles from './placeholder.module.css';

// Объединяем все стили в один объект для обратной совместимости
const styles = {
  ...panelStyles,
  ...headerStyles,
  ...dropdownStyles,
  ...problemsStyles,
  ...placeholderStyles,
};

export default styles;

// Экспортируем отдельные модули для точечного использования
export {
  panelStyles,
  headerStyles,
  dropdownStyles,
  problemsStyles,
  placeholderStyles,
};
