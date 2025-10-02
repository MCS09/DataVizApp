/**
 * Purpose: Render a simple menu list used within cleaning flows.
 * Params: None.
 * Returns: React components ready for reuse.
 * Steps: 1. Display a titled menu. 2. Map entries to MenuItem components. 3. Relay clicks to the provided handler.
 */
/**
 * Purpose: Present a menu of options.
 * Params: {list} Items to display, {onClick} callback when an item is chosen.
 * Returns: JSX.Element representing the menu.
 * Steps: 1. Render a title. 2. Iterate through the provided list. 3. Delegate rendering to MenuItem.
 */
export default function Menu({ list, onClick }: { list: string[], onClick: (text: string) => void  }) {
  return (
    <ul className="menu bg-base-200 rounded-box w-56">
      <li className="menu-title">Title</li>
      {list.map((item, idx) => (
        <MenuItem key={idx} text={item} onClick={onClick} />
      ))}
    </ul>
  );
}

/**
 * Purpose: Render a menu entry with click support.
 * Params: {text} Label to display, {onClick} callback triggered on selection.
 * Returns: JSX.Element representing the list item.
 * Steps: 1. Render a button-like anchor. 2. Attach the click handler. 3. Pass the item label back to the parent.
 */
function MenuItem({ text, onClick }: { text: string; onClick: (text: string) => void }) {
  return (
    <li>
      <a onClick={() => onClick(text)}>{text}</a>
    </li>
  );
}