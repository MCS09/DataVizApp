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

function MenuItem({ text, onClick }: { text: string; onClick: (text: string) => void }) {
  return (
    <li>
      <a onClick={() => onClick(text)}>{text}</a>
    </li>
  );
}