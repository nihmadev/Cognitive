import { getCurrentWindow } from '@tauri-apps/api/window';
import { Minus, Square, X } from 'lucide-react';

const TitleBar = () => {
  const appWindow = getCurrentWindow();
  const minimize = () => appWindow.minimize();
  const toggleMaximize = async () => {
    const isMaximized = await appWindow.isMaximized();
    if (isMaximized) {
      await appWindow.unmaximize();
    } else {
      await appWindow.maximize();
    }
  };
  const close = () => appWindow.close();

  return (
    <div className="titlebar-drag">
      <div className="app-menu">
        {/* Add your app menu items here */}
        <button>File</button>
        <button>Edit</button>
        <button>View</button>
      </div>

      <div className="titlebar-right">
        <button onClick={minimize} className="px-3 hover:bg-white/10">
          <Minus size={16} />
        </button>
        <button onClick={toggleMaximize} className="px-3 hover:bg-white/10">
          <Square size={14} />
        </button>
        <button
          onClick={close}
          className="px-3 hover:bg-red-500 hover:text-white"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
};

export default TitleBar;
