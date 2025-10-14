import { fetchData, postData } from "./api";

export type UserDatasetsDto = {
  datasets: Dataset[];
}

export type Dataset = {
  datasetId: number;
  userId: string;
  datasetName: string;
};

export type FileData = {
  id: string;
  accessToken: string;
};

export async function loadDriveFile(fileData: FileData): Promise<string> {
    const url = `https://www.googleapis.com/drive/v3/files/${fileData.id}?alt=media`;
    const response = await fetch(url, {
        headers: { Authorization: `Bearer ${fileData.accessToken}` },
    });
    if (!response.ok) throw new Error(`Error fetching file: ${response.statusText}`);

    const fileContent = await response.text();
    return fileContent;
}

// Get Column Profile
export const getColumnProfile = async (datasetId: number) =>
await fetchData<ColumnProfile[]>(
  `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/Dataset/getColumnsByDatasetId/${datasetId}`,
  {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  }
);

export type ColumnsDto = {
  datasetId: number;
  newColumns: ColumnProfile[];
  columnNamesMap: { oldColumnName: string; newColumnName: string }[];
};

export type ColumnProfile = {
    columnName: string;
    columnDescription: string;
    dataType: string;
    columnNumber: number;
    relationship: string;
}

export const saveColumns = async (body: ColumnsDto) =>
  await postData(
    `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/Dataset/setColumns`,
    body
  );