import Fieldset from "@/app/components/input/Fieldset";

export type ColumnProfile = {
    columnName: string;
    columnDescription: string;
    dataType: string;
    columnNumber: number;
}

export function CarouselItem({
  column,
  updateColumn,
}: {
  column: ColumnProfile;
  updateColumn: (updatedColumn: ColumnProfile) => void;
}) {
  return (
    <div className="carousel-item">
      <Fieldset column={column} updateColumn={updateColumn} />
    </div>
  );
}