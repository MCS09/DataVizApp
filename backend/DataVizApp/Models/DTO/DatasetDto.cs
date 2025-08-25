namespace DataVizApp.Models.DTO;
public record DatasetDto
{
    public required string UserId { get; set; }
    public required List<DatasetColumnDto> Columns { get; set; }
}

public record DatasetColumnDto
{
    public required string ColumnName { get; set; }
    public required string DataType { get; set; }

    public required string ColumnDescription { get; set; }
    public int ColumnNumber { get; set; }
    public string? Relationship { get; set; }
}