using System.Text.Json.Serialization;

namespace DataVizApp.Models.DTO;

public record DatasetRecordDto
{
    [JsonPropertyName("record_number")]
    public required int RecordNumber { get; set; }

    [JsonPropertyName("values")]
    public required List<CellValue> Values { get; set; }
}