using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Newtonsoft.Json;

namespace DataVizApp.Models;

[Table("dataset_records")]
[Index("DatasetId", Name = "ix_dataset_records_dataset_id")]
public class DatasetRecord
{
    [Column("dataset_id")]
    public required int DatasetId { get; set; }  // good partition key candidate

    [Column("column_number")]
    public required int ColumnNumber { get; set; }

    [Column("record_number")]
    public required int RecordNumber { get; set; }

    [Column("record_value")]
    public string? Value { get; set; }
}

public record RecordValueDto(int RecordNumber, string? Value);

public record ColumnValueDto(int ColumnNumber, string? Value);