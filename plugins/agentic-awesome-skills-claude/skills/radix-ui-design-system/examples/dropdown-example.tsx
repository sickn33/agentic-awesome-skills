import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import {
  HamburgerMenuIcon,
  DotFilledIcon,
  CheckIcon,
  ChevronRightIcon,
} from '@radix-ui/react-icons';
import './dropdown.css';

/**
 * Example: Complete Dropdown Menu
 * 
 * Features:
 * - Items, separators, labels
 * - Checkbox items
 * - Radio group items
 * - Sub-menus
 * - Keyboard navigation
 */
export function CompleteDropdown() {
  const [bookmarksChecked, setBookmarksChecked] = React.useState(true);
  const [urlsChecked, setUrlsChecked] = React.useState(false);
  const [person, setPerson] = React.useState('pedro');

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button className="icon-button" aria-label="Customise options">
          <HamburgerMenuIcon />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content className="dropdown-content" sideOffset={5}>
          {/* Regular items */}
          <DropdownMenu.Item className="dropdown-item">
            New Tab <div className="right-slot">⌘+T</div>
          </DropdownMenu.Item>
          <DropdownMenu.Item className="dropdown-item">
            New Window <div className="right-slot">⌘+N</div>
          </DropdownMenu.Item>
          <DropdownMenu.Item className="dropdown-item" disabled>
            New Private Window <div className="right-slot">⇧+⌘+N</div>
          </DropdownMenu.Item>

          {/* Sub-menu */}
          <DropdownMenu.Sub>
            <DropdownMenu.SubTrigger className="dropdown-subtrigger">
              More Tools
              <div className="right-slot">
                <ChevronRightIcon />
              </div>
            </DropdownMenu.SubTrigger>
            <DropdownMenu.Portal>
              <DropdownMenu.SubContent
                className="dropdown-subcontent"
                sideOffset={2}
                alignOffset={-5}
              >
                <DropdownMenu.Item className="dropdown-item">
                  Save Page As… <div className="right-slot">⌘+S</div>
                </DropdownMenu.Item>
                <DropdownMenu.Item className="dropdown-item">
                  Create Shortcut…
                </DropdownMenu.Item>
                <DropdownMenu.Item className="dropdown-item">
                  Name Window…
                </DropdownMenu.Item>
                <DropdownMenu.Separator className="dropdown-separator" />
                <DropdownMenu.Item className="dropdown-item">
                  Developer Tools
                </DropdownMenu.Item>
              </DropdownMenu.SubContent>
            </DropdownMenu.Portal>
          </DropdownMenu.Sub>

          <DropdownMenu.Separator className="dropdown-separator" />

          {/* Checkbox items */}
          <DropdownMenu.CheckboxItem
            className="dropdown-checkbox-item"
            checked={bookmarksChecked}
            onCheckedChange={setBookmarksChecked}
          >
            <DropdownMenu.ItemIndicator className="dropdown-item-indicator">
              <CheckIcon />
            </DropdownMenu.ItemIndicator>
            Show Bookmarks <div className="right-slot">⌘+B</div>
          </DropdownMenu.CheckboxItem>
          <DropdownMenu.CheckboxItem
            className="dropdown-checkbox-item"
            checked={urlsChecked}
            onCheckedChange={setUrlsChecked}
          >
            <DropdownMenu.ItemIndicator className="dropdown-item-indicator">
              <CheckIcon />
            </DropdownMenu.ItemIndicator>
            Show Full URLs
          </DropdownMenu.CheckboxItem>

          <DropdownMenu.Separator className="dropdown-separator" />

          {/* Radio group */}
          <DropdownMenu.Label className="dropdown-label">
            People
          </DropdownMenu.Label>
          <DropdownMenu.RadioGroup value={person} onValueChange={setPerson}>
            <DropdownMenu.RadioItem className="dropdown-radio-item" value="pedro">
              <DropdownMenu.ItemIndicator className="dropdown-item-indicator">
                <DotFilledIcon />
              </DropdownMenu.ItemIndicator>
              Pedro Duarte
            </DropdownMenu.RadioItem>
            <DropdownMenu.RadioItem className="dropdown-radio-item" value="colm">
              <DropdownMenu.ItemIndicator className="dropdown-item-indicator">
                <DotFilledIcon />
              </DropdownMenu.ItemIndicator>
              Colm Tuite
            </DropdownMenu.RadioItem>
          </DropdownMenu.RadioGroup>

          <DropdownMenu.Arrow className="dropdown-arrow" />
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

/**
 * Example: Simple Actions Menu
 * 
 * Common use case for data tables, cards, etc.
 */
export function ActionsMenu({ onEdit, onDuplicate, onDelete }) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button className="icon-button" aria-label="Actions">
          <DotsHorizontalIcon />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content className="dropdown-content" align="end">
          <DropdownMenu.Item className="dropdown-item" onSelect={onEdit}>
            Edit
          </DropdownMenu.Item>
          <DropdownMenu.Item className="dropdown-item" onSelect={onDuplicate}>
            Duplicate
          </DropdownMenu.Item>
          <DropdownMenu.Separator className="dropdown-separator" />
          <DropdownMenu.Item
            className="dropdown-item dropdown-item-danger"
            onSelect={onDelete}
          >
            Delete
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
