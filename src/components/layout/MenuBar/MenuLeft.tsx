import { motion, AnimatePresence } from 'framer-motion';
import type { MenuCategory } from './menuBarTypes';
import clsx from 'clsx';
import styles from './MenuLeft.module.css';

export const MenuLeft = ({
    menuStructure,
    activeMenu,
    setActiveMenu,
    handleMenuClick,
}: {
    menuStructure: MenuCategory[];
    activeMenu: string | null;
    setActiveMenu: (menu: string | null) => void;
    handleMenuClick: (category: string) => void;
}) => {
    return (
        <div className={styles.root}>
            <div className={styles.brand}>
                <img src="/icon.ico" alt="Colbex" className={styles.brandIcon} draggable={false} onContextMenu={(e) => e.preventDefault()} onDragStart={(e) => e.preventDefault()} />
            </div>
            {menuStructure.map((category) => (
                <div key={category.label} className={clsx(styles.menuItemWrap, "hidden lg:block")}>
                    <div
                        className={clsx(
                            styles.menuItem,
                            activeMenu === category.label ? styles.menuItemActive : styles.menuItemInactive
                        )}
                        onClick={() => handleMenuClick(category.label)}
                        onMouseEnter={() => activeMenu && setActiveMenu(category.label)}
                    >
                        {category.label}
                    </div>

                    <AnimatePresence>
                        {activeMenu === category.label && (
                            <motion.div
                                initial={{ opacity: 0, y: -5 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -5 }}
                                transition={{ duration: 0.1 }}
                                className={styles.dropdown}
                            >
                                {category.items.map((item, index) => (
                                    <div
                                        key={index}
                                        className={styles.dropdownItem}
                                        onClick={() => {
                                            item.action?.();
                                            setActiveMenu(null);
                                        }}
                                    >
                                        <span className={styles.dropdownLabel}>{item.label}</span>
                                        {item.shortcut && (
                                            <span className={styles.dropdownShortcut}>
                                                {item.shortcut}
                                            </span>
                                        )}
                                    </div>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            ))}

            {/* Always show at least File and Edit on smaller screens */}
            {menuStructure.slice(0, 2).map((category) => (
                <div key={category.label} className={clsx(styles.menuItemWrap, "lg:hidden")}>
                    <div
                        className={clsx(
                            styles.menuItem,
                            activeMenu === category.label ? styles.menuItemActive : styles.menuItemInactive
                        )}
                        onClick={() => handleMenuClick(category.label)}
                        onMouseEnter={() => activeMenu && setActiveMenu(category.label)}
                    >
                        {category.label}
                    </div>
                </div>
            ))}
        </div>
    );
};
