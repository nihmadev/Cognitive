import { 
  Settings as Gear, 
  Edit, 
  X, 
  Trash2 as ClearAll, 
  Sparkle, 
  Filter, 
  Menu, 
  Search,
  ChevronDown,
  RotateCcw as Discard,
  FileText as GoToFile,
  Circle as RecordKeys,
  ArrowUpDown as SortPrecedence,
  Plus as Add
} from 'lucide-react';

// VS Code inspired icons for settings
export const settingsScopeDropDownIcon = ChevronDown;
export const settingsMoreActionIcon = Gear;
export const keybindingsRecordKeysIcon = RecordKeys;
export const keybindingsSortIcon = SortPrecedence;
export const keybindingsEditIcon = Edit;
export const keybindingsAddIcon = Add;
export const settingsEditIcon = Edit;
export const settingsRemoveIcon = X;
export const settingsDiscardIcon = Discard;
export const preferencesClearInputIcon = ClearAll;
export const preferencesAiResultsIcon = Sparkle;
export const preferencesFilterIcon = Filter;
export const preferencesOpenSettingsIcon = GoToFile;

// Icon mappings for VS Code codicons to lucide-react
export const iconMap = {
  'settings-folder-dropdown': ChevronDown,
  'settings-more-action': Gear,
  'keybindings-record-keys': RecordKeys,
  'keybindings-sort': SortPrecedence,
  'keybindings-edit': Edit,
  'keybindings-add': Add,
  'settings-edit': Edit,
  'settings-remove': X,
  'preferences-discard': Discard,
  'preferences-clear-input': ClearAll,
  'preferences-ai-results': Sparkle,
  'settings-filter': Filter,
  'preferences-open-settings': GoToFile,
  'search': Search,
  'menu': Menu,
  'filter': Filter,
  'clear-all': ClearAll,
  'sparkle': Sparkle,
  'gear': Gear,
  'edit': Edit,
  'add': Add,
  'remove': X,
  'discard': Discard,
  'chevron-down': ChevronDown,
  'go-to-file': GoToFile,
  'record-keys': RecordKeys,
  'sort-precedence': SortPrecedence,
};

export function getIcon(iconName: string) {
  return iconMap[iconName as keyof typeof iconMap] || Gear;
}
