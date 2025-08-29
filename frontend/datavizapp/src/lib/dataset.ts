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
