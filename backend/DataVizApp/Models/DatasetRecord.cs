
using Newtonsoft.Json;

namespace DataVizApp.Models;
public class DataRecord
{
    [JsonProperty("id")]
    public required string Id { get; set; }  // must be string in Cosmos

    public required int DatasetId { get; set; }  // good partition key candidate

    public required int ColumnNumber { get; set; }

    public required int RecordNumber { get; set; }

    public required string Value { get; set; }
}

public record RecordValueDto(int RecordNumber, string Value);

public record ColumnValueDto(int ColumnNumber, string Value);