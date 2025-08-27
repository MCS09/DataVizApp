using System.Text.Json.Serialization;

namespace DataVizApp.Models;
public class DataRecord
{
    public required string Id { get; set; }  // must be string in Cosmos

    public required int DatasetId { get; set; }  // good partition key candidate

    public required int ColumnNumber { get; set; }

    public required int RecordNumber { get; set; }

    public required string Value { get; set; }
}

public record DataRecordDto(int RecordNumber, string Value);