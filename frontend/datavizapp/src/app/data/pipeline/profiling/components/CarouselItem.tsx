import Fieldset from "@/app/components/input/Fieldset";
import { ColumnProfile } from "@/lib/dataset";



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