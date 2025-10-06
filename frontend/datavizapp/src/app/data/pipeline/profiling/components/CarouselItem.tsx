import Fieldset from "@/app/components/input/Fieldset";

export type ColumnProfile = {
    columnName: string;
    columnDescription: string;
    dataType: string;
    columnNumber: number;
    relationship: string;
}

export function CarouselItem({
  columnHeader,
  columnProfile,
  updateColumn,
}: {
  columnHeader: string
  columnProfile: ColumnProfile;
  updateColumn: (updatedColumn: ColumnProfile) => void;
}) {
  return (
    <div className="carousel-item">
      <Fieldset columnHeader={columnHeader} column={columnProfile} updateColumn={updateColumn} />
    </div>
  );
}