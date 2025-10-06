export type RecordDto = {
    columnValueDtos : ColumnValueDto[];
}

type ColumnValueDto = {
    columnNumber: number;
    value: string;
}