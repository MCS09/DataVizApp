using System.Text.Json.Serialization;

namespace DataVizApp.Models;

// Suppress naming rule violations for Cosmos DB properties that require lowercase names.
public class DatasetRecord
{
    [JsonPropertyName("record_number")]
    public required int RecordNumber { get; set; }

    [JsonPropertyName("dataset_id")]
    public required int DatasetId { get; set; }

    [JsonPropertyName("values")]
    public required List<CellValue> Values { get; set; }
}

public class CellValue
{
    [JsonPropertyName("column_number")]
    public int ColumnNumber { get; set; }

    [JsonPropertyName("value")]
    public required string Value { get; set; } // Could be string, number, date, etc.
}