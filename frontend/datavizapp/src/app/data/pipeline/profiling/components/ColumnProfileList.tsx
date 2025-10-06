import Fieldset, { ColumnProfile } from "@/app/components/input/Fieldset";

import { Column } from "@/lib/hooks/useColumns";

type ColumnProfileListProps = {
  columns: Column[];
  updateColumn: (index: number, updatedColumn: ColumnProfile) => void;
};

export default function ColumnProfileList({
  columns,
  updateColumn,
}: ColumnProfileListProps) {
  return (
    <div className="flex-1 overflow-x-auto p-4">
      <div className="flex h-full space-x-4">
        {columns.map((column, index) => (
          <Fieldset
            key={index}
            columnHeader={column.columnHeader}
            column={column.columnProfile}
            updateColumn={(updatedColumn) => updateColumn(index, updatedColumn)}
          />
        ))}
      </div>
    </div>
  );
}