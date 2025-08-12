using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace DataVizApp.Models;

[Table("dataset_columns")]
[Index("DatasetId", "ColumnName", Name = "uq_dataset_columns", IsUnique = true)]
public partial class DatasetColumn
{
    [Key]
    [Column("dataset_id")]
    public int DatasetId { get; set; }
    
    [Key]
    [Column("column_number")]
    public int ColumnNumber { get; set; }

    [Column("column_name")]
    [StringLength(255)]
    public string ColumnName { get; set; } = null!;

    [Column("data_type")]
    [StringLength(50)]
    public string DataType { get; set; } = null!;

    [Column("relationship")]
    public string? Relationship { get; set; }
}
